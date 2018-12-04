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

            var save = modal.getElementsByClassName('is-modal-save');
            if (save.length == 1){
                modal.getElementsByTagName('form')[0].addEventListener('submit', function(evt){
                    save[0].classList.toggle('is-loading', true);
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