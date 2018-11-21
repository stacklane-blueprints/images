import {Post} from '📦';

import {newImage, title} from 'form';

new Post().image(newImage).title(title);

Redirect.home().success('Added ' + title);
