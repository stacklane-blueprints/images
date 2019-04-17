import {post} from '🔗';
import * as Properties from '🎨';

let newPost = post.get().copy();

newPost.title += ' (' + Properties.actionCopy()  + ')';

Redirect.home().success(Properties.successCopy(post.get().title));