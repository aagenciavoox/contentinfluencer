import assert from 'node:assert/strict';
import {test} from 'node:test';
import {appReducer} from './reducer';
import {initialState} from '../app/providers/appState';
import {createEmptyPostIt, transformPostIt} from '../features/planejamento/lib/postIt';
import {saudeDoMes} from '../features/planejamento/lib/monthHealth';

for (const target of ['ideia','roteiro'] as const) {
  test('conversão para ' + target + ' atualiza conteúdo e vínculo juntos, sem duplicação', () => {
    const pauta=createEmptyPostIt({id:'pauta',texto:'Título e notas reais',date:'2026-10-31'});
    const result=transformPostIt({postIt:pauta,contents:[],target});
    assert.ok(result.ok);
    if (!result.ok) return;
    const state={...initialState,postIts:[pauta]};
    const action={type:'CONVERT_POST_IT' as const,payload:{content:result.content,postIt:result.postIt}};
    const next=appReducer(state,action);
    assert.equal(next.postIts[0].contentId,next.contents[0].id);
    const counts=saudeDoMes({postIts:next.postIts,contents:next.contents,series:[],pilares:[],settings:next.editorial,periodo:{inicio:'2026-10-01',fim:'2026-10-31'}});
    assert.equal(counts.previsto,1);
    assert.equal(appReducer(next,action).contents.length,1,'repetir a atualização não duplica o conteúdo');
    assert.equal(state.contents.length,0,'o estado anterior permanece intacto');
  });
}
