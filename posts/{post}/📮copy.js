import {post} from '🔗';

let newPost = post.get().copy();

newPost.title += ' (Copy)';

Redirect.home().success('Copied ' + post.get().title);