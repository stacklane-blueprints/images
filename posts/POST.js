import {Post} from '📦';
import * as Properties from '🎨';

let post = new Post();

// TODO catch $ModelInvalid during submit, and show a message accordingly

Post.Form.submit(post);

Redirect.home().success(Properties.successAdd(post.title));
