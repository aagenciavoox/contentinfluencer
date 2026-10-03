import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {Template} from '../../../lib/database.ts';
import {
  resolveSeriesScriptTemplate,
  seriesScriptTemplateHtml,
  templateToHtml,
} from './seriesScriptTemplate.ts';

function template(partial: Partial<Template> & Pick<Template, 'id' | 'seriesId'>): Template {
  return {
    userId: 'user',
    nome: 'Modelo',
    type: 'roteiro',
    platformId: null,
    estrutura: [
      {id: 'b1', tipo: 'variavel', label: 'Gancho', conteudo: '', placeholder: 'Abra com a tensão'},
    ],
    ativo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('seriesScriptTemplateHtml', () => {
  it('renders the active roteiro template of the series', () => {
    const html = seriesScriptTemplateHtml('serie-1', [
      template({id: 'other', seriesId: 'serie-2'}),
      template({id: 'inactive', seriesId: 'serie-1', ativo: false, nome: 'Inativo'}),
      template({id: 'caption', seriesId: 'serie-1', type: 'legenda'}),
      template({
        id: 'script',
        seriesId: 'serie-1',
        estrutura: [
          {id: 'b1', tipo: 'fixo', label: 'Gancho', conteudo: 'Comece aqui', placeholder: ''},
        ],
      }),
    ]);

    assert.equal(html, templateToHtml({
      estrutura: [
        {id: 'b1', tipo: 'fixo', label: 'Gancho', conteudo: 'Comece aqui', placeholder: ''},
      ],
    }));
  });

  it('uses the most recently updated template when the series has more than one', () => {
    const html = seriesScriptTemplateHtml('serie-1', [
      template({id: 'old', seriesId: 'serie-1', nome: 'Antigo', updatedAt: '2026-01-01T00:00:00.000Z'}),
      template({
        id: 'new',
        seriesId: 'serie-1',
        nome: 'Novo',
        updatedAt: '2026-02-01T00:00:00.000Z',
        estrutura: [
          {id: 'b1', tipo: 'variavel', label: 'Virada', conteudo: 'O giro', placeholder: ''},
        ],
      }),
    ]);

    assert.match(html ?? '', /\[Virada\]/);
    assert.match(html ?? '', /O giro/);
  });
});

describe('resolveSeriesScriptTemplate', () => {
  const modelo = template({id: 'script', seriesId: 'serie-1'});
  const html = templateToHtml(modelo);

  it('fills a blank new script with the series template', () => {
    const result = resolveSeriesScriptTemplate({
      previousSeriesId: null,
      nextSeriesId: 'serie-1',
      script: null,
      templates: [modelo],
      appliedTemplateHtml: null,
      templatesReady: true,
    });

    assert.equal(result.script, html);
    assert.equal(result.appliedTemplateHtml, html);
    assert.equal(result.pendingSeriesId, null);
  });

  it('keeps a script the author already wrote', () => {
    const result = resolveSeriesScriptTemplate({
      previousSeriesId: null,
      nextSeriesId: 'serie-1',
      script: '<p>Texto próprio</p>',
      templates: [modelo],
      appliedTemplateHtml: null,
      templatesReady: true,
    });

    assert.equal(result.script, undefined);
    assert.equal(result.appliedTemplateHtml, null);
  });

  it('replaces the previous series template when the series changes', () => {
    const next = template({
      id: 'next',
      seriesId: 'serie-2',
      estrutura: [
        {id: 'b1', tipo: 'fixo', label: 'Fato', conteudo: 'O dado', placeholder: ''},
      ],
    });
    const nextHtml = templateToHtml(next);
    const result = resolveSeriesScriptTemplate({
      previousSeriesId: 'serie-1',
      nextSeriesId: 'serie-2',
      script: html,
      templates: [modelo, next],
      appliedTemplateHtml: html,
      templatesReady: true,
    });

    assert.equal(result.script, nextHtml);
    assert.equal(result.appliedTemplateHtml, nextHtml);
  });

  it('clears the applied template when the new series has none', () => {
    const result = resolveSeriesScriptTemplate({
      previousSeriesId: 'serie-1',
      nextSeriesId: 'serie-2',
      script: html,
      templates: [modelo],
      appliedTemplateHtml: html,
      templatesReady: true,
    });

    assert.equal(result.script, '');
    assert.equal(result.appliedTemplateHtml, null);
  });

  it('waits until templates are loaded before filling', () => {
    const result = resolveSeriesScriptTemplate({
      previousSeriesId: null,
      nextSeriesId: 'serie-1',
      script: '',
      templates: [],
      appliedTemplateHtml: null,
      templatesReady: false,
    });

    assert.equal(result.script, undefined);
    assert.equal(result.pendingSeriesId, 'serie-1');
  });

  it('waits for the script body before filling', () => {
    const result = resolveSeriesScriptTemplate({
      previousSeriesId: null,
      nextSeriesId: 'serie-1',
      script: undefined,
      templates: [modelo],
      appliedTemplateHtml: null,
      templatesReady: true,
    });

    assert.equal(result.pendingSeriesId, 'serie-1');
    assert.equal(result.script, undefined);
  });
});
