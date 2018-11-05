(function () {
    'use strict';

    App.register("modal", class extends Stimulus.Controller {
        connect(){
            var modal = document.getElementById(this.data.get('id'));
            var hide = modal.getElementsByClassName('is-modal-hide');

            for (var i = 0; i < hide.length; i++){
                hide[i].addEventListener('click', function(evt){
                    evt.preventDefault(); evt.stopPropagation();
                    modal.classList.toggle('is-active', false);
                });
            }
        }
        show(evt){
            evt.preventDefault(); evt.stopPropagation();
            var modal = document.getElementById(this.data.get('id'));
            modal.classList.toggle('is-active', true);
        }
    })
})();