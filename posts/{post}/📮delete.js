import {post} from '🔗';
import * as Properties from '🎨';

post.get().remove();

Redirect.home().warning(Properties.successDeleted(post.title));