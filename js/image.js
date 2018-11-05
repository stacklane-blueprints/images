/**
 * Handles an image upload control.
 *
 * Relies on Bulma's CSS file structure:
 *
 * https://bulma.io/documentation/form/file/
 */
(function () {
    'use strict';

    const REQUIRED_MSG = "Required";

    const ACCEPT = '.png, .jpg, .gif, image/png, image/jpeg, image/gif'; // Spec recommends both extension and mime type be specified

    // https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
    const FORMAT_BYTES = function(a,b){if(0==a)return"0 Bytes";var c=1024,d=b||2,e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],f=Math.floor(Math.log(a)/Math.log(c));return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]};

    App.register("image", class extends Stimulus.Controller {
        initialize(){
            if (!this._hasSupport()) alert('The File APIs are not fully supported in this browser.');
        }

        _hasSupport(){
            return window.File && window.FileReader && window.FileList && window.Blob;
        }

        connect(){
            if (!this._hasSupport()) return;

            this.actionLabel = this.element.querySelector('span.file-label');
            this.originalActionLabelHTML = this.actionLabel.innerHTML;

            this.file = this.element.getElementsByClassName('file-input')[0];
            this.file.setAttribute('accept', ACCEPT);

            // Use a hidden field for the actual input (handled by JS):
            this.input = document.createElement('input');
            this.input.setAttribute('type', 'hidden');

            // The hidden field assumes the name given to the file input:
            var name = this.file.getAttribute('name');
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

            var thiz = this;
            this.file.addEventListener('change', function(evt){ thiz._onFileChange(evt); });
        }

        choose(evt){
            this.file.click();
        }

        _setupProgress(xhr){
            var thiz = this;

            var abort = document.createElement('a');
            abort.setAttribute('class', 'delete is-small');
            abort.addEventListener('click', function(evt){
                evt.stopPropagation(); evt.preventDefault();

                try {
                    xhr.abort();
                } catch (ignore) {}

                thiz._handleError(null, null, null);
            });


            var progress = document.createElement('progress');
            progress.setAttribute('max', '100'); // Dummy value waiting for true max from XHR
            // Leave 'value' out to indicate indeterminate for Bulma 0.7.3: progress.setAttribute('value', 0);
            progress.setAttribute('class', 'progress is-primary'); // Bulma classes

            thiz.actionLabel.innerHTML = '';
            thiz.actionLabel.appendChild(progress);
            thiz.actionLabel.appendChild(abort);

            return progress;
        }

        _setFileDisplay(display){
            var fileName = this.actionLabel; //this.element.getElementsByClassName('file-name')[0];
            fileName.innerText = display + ' '; // spacing for tag
        }

        _addFileDisplayTag(cls, label){
            var fileName = this.actionLabel; //this.element.getElementsByClassName('file-name')[0];
            var tag = document.createElement('span');
            tag.setAttribute('class', 'tag ' + cls);
            tag.innerText = label;
            fileName.appendChild(tag);
        }

        _resetActionLabel(){
            this.actionLabel.innerHTML = this.originalActionLabelHTML;
        }

        _resetFileValue(){
            this.file.setCustomValidity('');

            // Modern browsers:
            try { this.file.value = null; } catch(ex) { }

            // Fallback old browsers:
            //if (this.file.value) this.file.parentNode.replaceChild(this.file.cloneNode(true), this.file);
        }

        /**
         * After an error/abort, must choose a new file to get things reset.
         */
        _handleError(validity, msg, console){
            this._resetFileValue();
            this._resetActionLabel();
            this.input.value = '';
            if (msg) {
                this._setFileDisplay('');
                this._addFileDisplayTag('is-danger', msg);
            }
            if (validity) {
                this.file.setCustomValidity(validity);
            } else if (this.file.getAttribute('data-required') == 'true'){
                this.file.setCustomValidity(REQUIRED_MSG);
            }
            if (console) console.error(console);
        }

        _onFileChange(evt){
            var thiz = this;
            var file = thiz.file.files[0];

            // Only process image files (probably already handled by native file chooser):
            if (!file.type.match('image.*')) {
                thiz.file.setCustomValidity('Not an Image');
                return;
            }

            // Initial validity state on change:
            thiz.file.setCustomValidity('Uploading');

            var autoFillName = null;
            if (thiz.data.get('auto-fill-name')){
                autoFillName = thiz.element
                    .closest('form')
                    .querySelector('input[name="' + thiz.data.get('auto-fill-name') + '"]');
                if (!autoFillName) console.warn("Unable to find input named " + thiz.data.get('auto-fill-name'));
            }

            var xhr = new XMLHttpRequest();
            var progress = thiz._setupProgress(xhr);

            var newPutUrlData = new FormData();
            newPutUrlData.set('name', file.name);

            fetch(thiz.data.get('new-put-url'), {
                method: 'post',
                body: newPutUrlData
            }).catch(function(){
                thiz._handleError('Upload Failed', 'Offline?')
            }).then(function(response) {
                return response.json();
            }).then(function(data) {
                var putUrl = data.url;

                xhr.open('PUT', putUrl, true);

                xhr.setRequestHeader("Content-Type", ''); // our request signature allows any content type / unspecified.

                xhr.upload.addEventListener("progress", function (evt) {
                    if (evt.lengthComputable) { // Update progress:
                        progress.setAttribute('max', evt.total);
                        progress.setAttribute('value', evt.loaded);
                        progress.innerHTML = Math.round(evt.loaded / evt.total * 100) + "%";
                    }
                }, false);

                xhr.addEventListener("load", function (evt) {
                    if (xhr.status === 200) {
                        if (autoFillName && (autoFillName.value == null || autoFillName.length == 0))
                            autoFillName.value = file.name;

                        // Important to reset regardless of success/failure,
                        // as even with multipart forms we do not want to receive the value:
                        thiz._resetFileValue();
                        thiz.input.value = putUrl;
                        thiz._setFileDisplay(file.name);
                        thiz._addFileDisplayTag('is-success', FORMAT_BYTES(file.size,0));
                    } else {
                        thiz._handleError('Upload Failed', 'Failed (' + xhr.status + ')', xhr.status);
                    }
                });

                xhr.addEventListener('error', function (evt) {
                    thiz._handleError('Upload Failed', 'Failed', evt);
                });

                xhr.send(file);
            });

        }
    });
})();