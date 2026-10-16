import assert from 'node:assert/strict';
import {draftDiffers, immediateSaveUpdates} from './draftChanges.ts';
import {applyUserTags} from './contentTags.ts';

// Bug: editar tags só mudava o rascunho e esperava o autosave; sair antes perdia a edição.
const saved = {title: 'A', tags: ['gravar']};
const edited = {...saved, tags: applyUserTags(saved.tags, ['halloween'])};

assert.deepEqual(edited.tags, ['gravar', 'halloween']);
assert.equal(draftDiffers(edited, saved), true);
assert.deepEqual(immediateSaveUpdates(saved, {tags: edited.tags}), {tags: ['gravar', 'halloween']});
assert.equal(immediateSaveUpdates(saved, {tags: ['gravar']}), null);
assert.equal(immediateSaveUpdates(saved, {title: 'B'}), null);
assert.deepEqual(immediateSaveUpdates(edited, {tags: applyUserTags(edited.tags, [])}), {tags: ['gravar']});

console.log('ok - tag edits save right away and keep production tags');
