'use strict';

class UIMessage extends HTMLElement{
    constructor() {
        super();
    }
    _remove(){
        this.parentElement.removeChild(this);
    }
    connectedCallback(){
        const thiz = this;
        const timeout = setTimeout(function(){ thiz._remove(); }, 4000);
        const actions = thiz.getElementsByClassName('delete');

        thiz.classList.add('notification', 'is-block');

        if (actions.length > 0) {
            actions[0].addEventListener('click', function (evt) {
                evt.stopPropagation();
                evt.preventDefault();
                clearTimeout(timeout);
                thiz._remove();
            });
        }
    }
}
window.customElements.define('ui-message', UIMessage);
