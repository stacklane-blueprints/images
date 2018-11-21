(function () {
    'use strict';

    App.register("notification", class extends Stimulus.Controller {
        _remove(){
            this.element.parentElement.removeChild(this.element);
        }
        connect(){
            var thiz = this;

            var timeout = setTimeout(function(){ thiz._remove(); }, 4000);

            var actions = thiz.element.getElementsByClassName('delete');

            if (actions.length > 0) {
                actions[0].addEventListener('click', function (evt) {
                    evt.stopPropagation();
                    evt.preventDefault();
                    clearTimeout(timeout);
                    thiz._remove();
                });
            }
        }
    })
})();