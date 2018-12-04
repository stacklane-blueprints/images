import {post} from '🔗';
import * as Properties from '🎨';

let newPost = post.get().copy();

newPost.title += ' (' + Properties.action_copy()  + ')';

Redirect.home().success(Properties.success_copy(post.get().title));