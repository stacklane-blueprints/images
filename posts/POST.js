import {Post} from '📦';
import * as Properties from '🎨';

import {newImage, title} from 'form';

new Post().image(newImage).title(title);

Redirect.home().success(Properties.successAdd(title));
