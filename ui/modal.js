'use strict';

class UIShowModal extends HTMLElement{
    constructor() {
        super();
    }

    connectedCallback(){
        const id = this.getAttribute('modal');
        this.addEventListener('click', function(evt){
           document.getElementById(id).show();
        });
    }
}
window.customElements.define('ui-show-modal', UIShowModal);

class UIModal extends HTMLElement{
    constructor() {
        super();
    }
    show(){
        this.classList.toggle('is-active', true);
    }
    connectedCallback(){
        this.classList.add('modal');

        const modal = this;
        const hide = modal.getElementsByClassName('is-modal-hide');
        const save = modal.getElementsByClassName('is-modal-save');

        for (var i = 0; i < hide.length; i++){
            hide[i].addEventListener('click', function(evt){
                evt.preventDefault(); evt.stopPropagation();
                modal.classList.toggle('is-active', false);
            });
        }

        if (save.length == 1){
            modal.getElementsByTagName('form')[0].addEventListener('submit', function(evt){
                save[0].classList.toggle('is-loading', true);
            });
        }
    }
}
window.customElements.define('ui-modal', UIModal);
