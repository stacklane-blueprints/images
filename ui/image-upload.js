/**
 * Handles an image upload control and preview.
 *
 * Depends On:
 *
 * - https://bulma.io/documentation/form/file/
 * - https://github.com/blueimp/JavaScript-Load-Image
 */

const UI_IMAGE_UPLOAD_REQUIRED_MSG = "Required";
const UI_IMAGE_UPLOAD_ACCEPT = '.png, .jpg, .gif, .jpeg, image/png, image/jpeg, image/gif'; // Spec recommends both extension and mime type be specified

class UIImageUpload extends HTMLElement{
    constructor() {
        super();
    }
    _hasSupport(){
        return window.File && window.FileReader && window.FileList && window.Blob;
    }
    connectedCallback(){
        if (!this._hasSupport()) {
            alert('The File APIs are not fully supported in this browser.');
            return;
        }
        this.actionLabel = this.querySelector('span.file-label');
        this.preview = this.querySelector('.file-preview');
        this.originalActionLabelHTML = this.actionLabel.innerHTML;

        this.file = this.querySelector('.file-input');
        this.file.setAttribute('accept', UI_IMAGE_UPLOAD_ACCEPT);

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
            this.file.setCustomValidity(UI_IMAGE_UPLOAD_REQUIRED_MSG);
        }

        // Append the hidden field.
        this.appendChild(this.input);

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
        let fileName = this.actionLabel;
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
                this.file.setCustomValidity(UI_IMAGE_UPLOAD_REQUIRED_MSG);
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

        fetch(thiz.getAttribute('new-put-href'), {
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
            const thiz = this;

            loadImage(
                file,
                function (result, meta) {
                    if (meta && meta.exif){
                        const rotated = meta.exif.get('Orientation') >= 2 && meta.exif.get('Orientation') <= 8;
                        result.setAttribute('data-rotated', rotated ? 'true' : 'false');
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
        if (this.getAttribute('then-focus')){
            let thenFocus = document.querySelector(this.getAttribute('then-focus'));
            if (thenFocus){
                thenFocus.focus();
            } else {
                console.error("then-focus not found: " + this.getAttribute('then-focus'));
            }
        }
    }
}
window.customElements.define('ui-image-upload', UIImageUpload);
