/**
 * Generate a new PUT URL for the upload server.
 *
 * Every new upload attempt must use a new URL.
 *
 * Overwrites to a previously generated URL are not allowed.
 */

import {Post} from '📦';

import {name} from 'form';

if (!Post.image.isValidFileName(name)) throw 'InvalidImageFileName';

let newUrl = Post.image.newPutUrl(name);

({url: newUrl});