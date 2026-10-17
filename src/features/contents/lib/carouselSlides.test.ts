import assert from 'node:assert/strict';
import type {CarouselSlide} from '../../../lib/database.ts';
import {
  addSlideAfter,
  carouselPlainText,
  contentReadableBody,
  duplicateSlide,
  imageRefHref,
  isCarouselContent,
  moveSlide,
  normalizeWritingMode,
  readCarouselSlides,
  removeSlide,
  slideHasContent,
  slidesForCarouselMode,
  updateSlide,
} from './carouselSlides.ts';

function slide(id: string, html: string, images: string[] = []): CarouselSlide {
  return {id, html, images: images.map((value, index) => ({id: `${id}-img-${index}`, value}))};
}

// Texto -> Carrossel: o texto existente vira a Tela 1, sem perder nada.
const script = '<p>Gancho forte.</p><p>Segunda parte.</p>';
const fromText = slidesForCarouselMode(script, []);
assert.equal(fromText.length, 1);
assert.equal(fromText[0]?.html, script);
assert.deepEqual(fromText[0]?.images, []);
console.log('ok - carousel: entering carousel turns the current text into Tela 1');

// Sem texto, começa com uma tela vazia.
const empty = slidesForCarouselMode('<p></p>', undefined);
assert.equal(empty.length, 1);
assert.equal(empty[0]?.html, '');
console.log('ok - carousel: empty script starts with one empty screen');

// Voltar ao carrossel recupera as telas guardadas, mesmo que o texto tenha mudado.
const saved = [slide('a', '<p>Tela guardada</p>'), slide('b', '<p>Outra</p>')];
assert.deepEqual(slidesForCarouselMode('<p>Texto novo</p>', saved), saved);
// Telas guardadas mas vazias: o texto atual vira a Tela 1.
assert.equal(slidesForCarouselMode(script, [slide('x', '<p></p>')])[0]?.html, script);
console.log('ok - carousel: switching back keeps saved screens and never drops text');

// Texto simples para busca, contagem e prévia.
const slides = [
  slide('a', '<p>Capa <strong>forte</strong></p>'),
  slide('b', '<p></p>', ['https://exemplo.com/a.png']),
  slide('c', '<p>Dica final</p>'),
];
assert.equal(carouselPlainText(slides), 'Capa forte\n\nDica final');
assert.equal(carouselPlainText(slides, {labels: true}), 'Tela 1\nCapa forte\n\nTela 3\nDica final');
assert.equal(carouselPlainText(undefined), '');
assert.equal(
  contentReadableBody({script: '<p>Roteiro</p>', writingMode: 'carrossel', carouselSlides: slides}),
  'Capa forte\n\nDica final',
);
assert.equal(contentReadableBody({script: '<p>Roteiro</p>', writingMode: 'texto', carouselSlides: slides}), 'Roteiro');
// Carrossel sem as telas carregadas ainda: usa o texto (não some da busca).
assert.equal(contentReadableBody({script: '<p>Roteiro</p>', writingMode: 'carrossel'}), 'Roteiro');
console.log('ok - carousel: plain text joins screens for search, count and preview');

// Operações nas telas.
const added = addSlideAfter(saved, 'a');
assert.equal(added.length, 3);
assert.equal(added[0]?.id, 'a');
assert.equal(added[2]?.id, 'b');
const dup = duplicateSlide([slide('a', '<p><span data-comment-id="c1" class="c">Oi</span></p>', ['nota'])], 'a');
assert.equal(dup.length, 2);
assert.notEqual(dup[1]?.id, 'a');
assert.equal(dup[1]?.html, '<p>Oi</p>');
assert.equal(dup[1]?.images[0]?.value, 'nota');
assert.notEqual(dup[1]?.images[0]?.id, 'a-img-0');
assert.deepEqual(moveSlide(saved, 'b', -1).map(item => item.id), ['b', 'a']);
assert.deepEqual(moveSlide(saved, 'a', -1).map(item => item.id), ['a', 'b']);
assert.deepEqual(removeSlide(saved, 'a').map(item => item.id), ['b']);
const last = removeSlide([slide('a', '<p>x</p>')], 'a');
assert.equal(last.length, 1);
assert.notEqual(last[0]?.id, 'a');
assert.equal(updateSlide(saved, 'b', {html: '<p>novo</p>'})[1]?.html, '<p>novo</p>');
assert.equal(slideHasContent(slide('a', '<p> </p>')), false);
assert.equal(slideHasContent(slide('a', '', ['foto do café'])), true);
console.log('ok - carousel: add, duplicate, move and delete screens');

// Leitura defensiva do banco/cache.
assert.deepEqual(readCarouselSlides(null), []);
assert.deepEqual(readCarouselSlides('lixo'), []);
const read = readCarouselSlides(JSON.stringify([{id: 's1', html: '<p>a</p>', images: ['https://x.com/i.png', {value: 'nota'}]}, 3]));
assert.equal(read.length, 1);
assert.equal(read[0]?.id, 's1');
assert.deepEqual(read[0]?.images.map(image => image.value), ['https://x.com/i.png', 'nota']);
assert.equal(normalizeWritingMode('carrossel'), 'carrossel');
assert.equal(normalizeWritingMode('qualquer'), 'texto');
assert.equal(isCarouselContent({writingMode: 'carrossel'}), true);
assert.equal(isCarouselContent({writingMode: undefined}), false);
console.log('ok - carousel: reads stored screens defensively');

// Links de imagem: só endereços viram link clicável.
assert.equal(imageRefHref('https://exemplo.com/a.png'), 'https://exemplo.com/a.png');
assert.equal(imageRefHref('www.exemplo.com/a.png'), 'https://www.exemplo.com/a.png');
assert.equal(imageRefHref('foto minha no espelho'), null);
assert.equal(imageRefHref('javascript:alert(1)'), null);
console.log('ok - carousel: only real addresses become clickable image links');
