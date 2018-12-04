import {post} from '🔗';
import * as Properties from '🎨';

post.get().remove();

Redirect.home().warning(Properties.success_deleted(post.title));