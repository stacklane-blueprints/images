
import {Post} from '📦';
import * as Properties from '🎨';

const post = new Post();

Post.Form.submit(post);

Redirect.home().success(
    Properties.successAdd(post.title)
);
