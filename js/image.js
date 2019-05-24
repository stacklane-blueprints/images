/**
 * Handles an image upload control and preview.
 *
 * Relies on Bulma's CSS file structure:
 *
 * https://bulma.io/documentation/form/file/
 */
(()=>{
    'use strict';

    const REQUIRED_MSG = "Required";

    const ACCEPT = '.png, .jpg, .gif, .jpeg, image/png, image/jpeg, image/gif'; // Spec recommends both extension and mime type be specified

    const GPS_TO_DECIMAL = (exif)=>{
        if (!exif) return [];
        let latRef = exif.get('GPSLatitudeRef')
        let latArr = exif.get('GPSLatitude');
        let longRef = exif.get('GPSLongitudeRef')
        let longArr = exif.get('GPSLongitude');
        if (!latRef || !latArr || latArr.length != 3 || !longRef || longArr.length !=3) return [];
        try {
            return [
                COORDS_TO_DECIMAL(latRef, latArr),
                COORDS_TO_DECIMAL(longRef, longArr)
            ];
        } catch (e){
            console.error(e);
            return [];
        }
    }

    const COORDS_TO_DECIMAL = (ref, coords)=>{
        let v = coords[0] + (coords[1] / 60) + (coords[2] / 3600);
        if (ref == 'W' || ref == 'S') v = v * -1;
        return v;
    };

    App.register("image", class extends Stimulus.Controller {
        initialize(){
            if (!this._hasSupport()) alert('The File APIs are not fully supported in this browser.');
        }

        _hasSupport(){
            return window.File && window.FileReader && window.FileList && window.Blob;
        }

        connect(){
            if (!this._hasSupport()) return; // alert already shown in initialize()

            this.actionLabel = this.element.querySelector('span.file-label');
            this.preview = this.element.querySelector('.file-preview');
            this.originalActionLabelHTML = this.actionLabel.innerHTML;

            this.file = this.element.querySelector('.file-input');
            this.file.setAttribute('accept', ACCEPT);

            // Use a hidden field for the actual input (handled by JS):
            this.input = document.createElement('input');
            this.input.setAttribute('type', 'hidden');

            // The hidden field assumes the name given to the file input:
            let name = this.file.getAttribute('name');
            this.file.setAttribute('name', name + '_file');
            this.input.setAttribute('name', name);

            // Use custom validity for 'required' handling, so we can easily clear it out:
            if (this.file.required) {
                this.file.removeAttribute('required');
                this.file.setAttribute('data-required', 'true');
                this.file.setCustomValidity(REQUIRED_MSG);
            }

            // Append the hidden field.
            this.element.appendChild(this.input);

            let thiz = this;
            this.file.addEventListener('change', (evt)=>{ thiz._onFileChange(evt); });
        }

        choose(evt){
            this.file.click();
        }

        _setupProgress(xhr){
            let thiz = this;

            let abort = document.createElement('a');
            abort.setAttribute('class', 'delete is-small');
            abort.addEventListener('click', (evt)=>{
                evt.stopPropagation(); evt.preventDefault();

                try {
                    xhr.abort();
                } catch (ignore) {}

                thiz._handleError(null, null, null);
            });

            let progress = document.createElement('progress');
            progress.setAttribute('value', '0');
            progress.setAttribute('max', '100'); // Dummy value waiting for true max from XHR
            progress.setAttribute('class', 'progress is-primary'); // Bulma classes

            thiz.actionLabel.innerHTML = '';
            thiz.actionLabel.appendChild(progress);
            thiz.actionLabel.appendChild(abort);

            return progress;
        }

        _setFileDisplay(display){
            let fileName = this.actionLabel; //this.element.getElementsByClassName('file-name')[0];
            fileName.innerText = display + ' '; // spacing for tag
        }

        _resetActionLabel(){
            this.actionLabel.innerHTML = this.originalActionLabelHTML;
        }

        _resetFileValue(valid){
            if (valid){
                this.file.setCustomValidity('');
            } else {
                this.preview.innerHTML = '';
                if (this.file.getAttribute('data-required') == 'true')
                    this.file.setCustomValidity(REQUIRED_MSG);
            }

            // Modern browsers (?):
            try { this.file.value = null; } catch(ex) {
                console.error(ex);
            }

            // or swap out the 'type'?
            this.file.setAttribute('type', 'text');
            this.file.setAttribute('type', 'file');

            // Fallback old browsers:
            //if (this.file.value) this.file.parentNode.replaceChild(this.file.cloneNode(true), this.file);
        }

        /**
         * After an error/abort, must choose a new file to get things reset.
         */
        _handleError(validity, msg, consoleValue){
            this._resetFileValue(false);
            this._resetActionLabel();
            this.input.value = '';
            if (msg) {
                this._setFileDisplay('');
                //this._addFileDisplayTag('is-danger', msg);
            }
            if (validity) {
                this.file.setCustomValidity(validity);
                // ?? why over plain 'required'
                //  else if (this.file.getAttribute('data-required') == 'true'){
                //   this.file.setCustomValidity(REQUIRED_MSG);
            }
            if (consoleValue) console.error(consoleValue);
        }

        _onFileReady(file, canvas){
            if (this.preview) {
                this.preview.innerHTML = '';
                this.preview.appendChild(canvas);
            }

            let rotated = canvas.getAttribute('data-rotated') === 'true';

            /**
             * Whether to perform rotation on client (not ideal).
             *
             * Not needed for:
             *
             * 1) iOS (auto displays as rotated based on exif)
             * 2) Clients without toBlob
             * 3) Future: clients that support CSS4 image-orientation: from-image
             */
            let hasToBlobSupport = (typeof HTMLCanvasElement.prototype.toBlob === 'function'); /* iOS/not-rotatable */
            let wantsPreprocessRotation = rotated && hasToBlobSupport;

            let width = canvas.getAttribute('width');
            let height = canvas.getAttribute('height');

            if (!wantsPreprocessRotation){
                width = canvas.getAttribute('data-original-width');
                height = canvas.getAttribute('data-original-height');
            }

            let xhr = new XMLHttpRequest();
            let progress = this._setupProgress(xhr);

            let newPutUrlData = new FormData();
            newPutUrlData.set('name', file.name.replace('.jpeg', '.jpg') /* normalize */);
            if (width > 0 && height > 0) {
                newPutUrlData.set('width', '' + width);
                newPutUrlData.set('height', '' + height);
            } else {
                console.log('Unknown width/height');
            }

            let thiz = this;

            fetch(thiz.data.get('new-put-href'), {
                method: 'post',
                body: newPutUrlData,
                credentials: 'same-origin',
                mode: 'same-origin',
                redirect: 'error',
                headers: {'Accept': 'application/json'}
            }).catch((e)=>{
                thiz._handleError('Upload Failed', 'Offline?');
                console.error(e);
            }).then((response)=>{
                if (response.status != 200) {
                    thiz._handleError('Upload Failed', 'Error: ' + response.status);
                    console.error(response);
                } else {
                    return response.json();
                }
            }).then((data)=>{
                if (!data) return; // could be an error

                let putUrl = data.url;

                xhr.open('PUT', putUrl, true);

                xhr.setRequestHeader("Content-Type", ''); // our request signature allows any content type / unspecified

                xhr.upload.addEventListener("progress", (evt)=>{
                    if (evt.lengthComputable) { // Update progress:
                        progress.setAttribute('max', evt.total);
                        progress.setAttribute('value', evt.loaded);
                        progress.innerHTML = Math.round(evt.loaded / evt.total * 100) + "%";
                    }
                }, false);

                xhr.addEventListener("load", (evt)=>{
                    if (xhr.status === 200) {
                        // IMPORTANT to reset regardless of success/failure,
                        // as even with multipart forms we do not want to receive the value:
                        thiz._resetFileValue(true);
                        thiz.input.value = putUrl;

                        thiz._setFileDisplay('Change Image...');
                    } else {
                        thiz._handleError('Upload Failed', 'Failed (' + xhr.status + ')', xhr.status);
                    }
                });

                xhr.addEventListener('error', (evt)=>{
                    thiz._handleError('Upload Failed', 'Failed', evt);
                });

                if (wantsPreprocessRotation) {
                    // Not ideal, because it causes lossy re-encoding on the client.
                    canvas.toBlob((blob)=>{
                        xhr.send(blob);
                    }, 'image/jpeg'); // TODO retain png or jpg based on original image
                } else {
                    // Ideal, and most images are probably already oriented correctly.
                    xhr.send(file);
                }
            });
        }

        _onFileChange(evt){
            if (!this.file.files.length) {
                if (this.preview) this.preview.innerHTML = ''; // clear any previous
                return; // no image selected, exit
            }

            let file = this.file.files[0];

            // Images Only (probably already handled by native file chooser):
            if (!file.type.match('image.*')) {
                this.file.setCustomValidity('Not an Image');
                return;
            }

            // Initial validity state on change:
            this.file.setCustomValidity('Uploading');

            {
                let thiz = this;

                loadImage(
                    file,
                    function (result, meta) {
                        if (meta && meta.exif){
                            let rotated = meta.exif.get('Orientation') >= 2 && meta.exif.get('Orientation') <= 8;

                            result.setAttribute('data-rotated', rotated ? 'true' : 'false');

                            let gps = GPS_TO_DECIMAL(meta.exif);

                            let locationInputValue = '';

                            if (gps && gps.length == 2){
                                result.setAttribute('data-latitude', gps[0]);
                                result.setAttribute('data-longitude', gps[1]);

                                locationInputValue = gps[0] + ',' + gps[1];
                            }

                            if (thiz.data.get('location-input')) {
                                let i = document.querySelector(thiz.data.get('location-input'));
                                if (i) {
                                    // Important dispatch event on even an empty value:
                                    i.value = locationInputValue;
                                    i.dispatchEvent(new Event('change'));
                                }
                            }
                        }

                        if (meta){
                            result.setAttribute('data-original-width', meta.originalWidth);
                            result.setAttribute('data-original-height', meta.originalHeight);
                        }

                        thiz._onFileReady(file, result);
                    },
                    {
                        canvas: true,
                        orientation: true, // reorient as needed accordingly to exif
                        meta: true
                    }
                );
            }

            // data-image-then-focus
            if (this.data.get('then-focus')){
                let thenFocus = document.querySelector(this.data.get('then-focus'));
                if (thenFocus){
                    thenFocus.focus();
                } else {
                    console.error("image-then-focus not found: " + this.data.get('then-focus'));
                }
            }
        }
    });
})();