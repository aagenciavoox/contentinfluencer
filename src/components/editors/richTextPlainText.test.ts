import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { htmlToReadableText } from '../../lib/utils.ts';
import { buildPrompterLines } from '../../features/contents/lib/prompterLines.ts';

// Coloque este arquivo ao lado do teste original para preservar os imports relativos.
const html =
  '<p>Comece com <mark data-color="#FFF3A3" style="background-color: #FFF3A3; color: #111111">um gancho</mark> ' +
  '<span style="color: #D2453B">forte</span>. ' +
  '<span data-comment-id="abc" class="comment-anchor">Depois explique.</span></p>';
const expectedText = 'Comece com um gancho forte. Depois explique.';

// Aqui a normalização serve para comparar palavras, sem impor um formato de parágrafos ao utilitário.
function normalizeWhitespace(value: string) {
  return value.replace(/\s+/gu, ' ').trim();
}

describe('texto puro para DOCX e teleprompter', () => {
  describe('htmlToReadableText', () => {
    it('remove destaque, cor e âncora de comentário sem alterar a frase', () => {
      assert.equal(htmlToReadableText(html), expectedText);
    });

    it('preserva o texto em formatações aninhadas', () => {
      assert.equal(
        htmlToReadableText('<p><strong>Texto <em>com <mark>destaque</mark></em></strong>.</p>'),
        'Texto com destaque.',
      );
    });

    it('não junta palavras que estavam separadas por parágrafos', () => {
      assert.equal(
        normalizeWhitespace(htmlToReadableText('<p>Primeiro parágrafo.</p><p>Segundo parágrafo.</p>')),
        'Primeiro parágrafo. Segundo parágrafo.',
      );
    });

    it('não junta palavras separadas por uma quebra de linha', () => {
      assert.equal(
        normalizeWhitespace(htmlToReadableText('<p>Primeira linha.<br>Segunda linha.</p>')),
        'Primeira linha. Segunda linha.',
      );
    });

    it('converte entidades HTML em caracteres legíveis', () => {
      assert.equal(
        normalizeWhitespace(htmlToReadableText('<p>Anne &amp; Maria&nbsp;leem &quot;Histórias&quot;.</p>')),
        'Anne & Maria leem "Histórias".',
      );
    });

    it('preserva símbolos e códigos que fazem parte do texto escrito', () => {
      assert.equal(
        htmlToReadableText('<p>Use &lt;3, compare A &gt; B e anote #FFF3A3 e data-id.</p>'),
        'Use <3, compare A > B e anote #FFF3A3 e data-id.',
      );
    });

    for (const emptyHTML of ['', '<p></p>', '<p><br></p>']) {
      it(`retorna texto vazio para ${JSON.stringify(emptyHTML)}`, () => {
        assert.equal(htmlToReadableText(emptyHTML).trim(), '');
      });
    }
  });

  describe('buildPrompterLines', () => {
    it('recebe o texto convertido e mantém a ordem e o conteúdo das palavras', () => {
      const lines = buildPrompterLines(htmlToReadableText(html), 12);
      assert.ok(Array.isArray(lines));
      assert.ok(lines.length > 0, 'A frase deve gerar ao menos uma linha.');
      assert.ok(lines.every(line => typeof line === 'string'));
      assert.equal(normalizeWhitespace(lines.join(' ')), expectedText);
    });

    it('preserva acentos, pontuação e emoji durante a distribuição das linhas', () => {
      const text = 'Atenção: amanhã tem ação, emoção e histórias! 📚';
      const lines = buildPrompterLines(text, 12);
      assert.equal(normalizeWhitespace(lines.join(' ')), text);
    });

    it('preserva símbolos legítimos, sem confundi-los com resíduos de HTML', () => {
      const text = htmlToReadableText('<p>Use &lt;3 e anote a cor #FFF3A3.</p>');
      const lines = buildPrompterLines(text, 12);
      assert.equal(normalizeWhitespace(lines.join(' ')), 'Use <3 e anote a cor #FFF3A3.');
    });

    it('não inventa texto quando o conteúdo está vazio', () => {
      const lines = buildPrompterLines('', 12);
      assert.equal(lines.join('').trim(), '');
    });
  });
});
