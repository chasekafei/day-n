import assert from 'node:assert/strict';
import test from 'node:test';
import { loadLocal, saveLocal } from '../src/platform.ts';

type Options = Record<string, unknown> & {
  success: (result: unknown) => void;
  fail: (error: unknown) => void;
};
type Bridge = Record<string, (options: Options) => unknown>;

function environment(bridge?: Bridge) {
  const browserStore = new Map<string, string>();
  const mockWindow = {
    setTimeout,
    clearTimeout,
    ...(bridge ? { xhs: { miniTool: bridge, launchOptions: { miniToolEnv: { buildVersion: 9490001 } } } } : {}),
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: mockWindow });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      // 小红书没有这项缓存时，getItem 会返回空字符串，而不是 null。
      getItem: (key: string) => browserStore.has(key) ? browserStore.get(key)! : '',
      setItem: (key: string, value: string) => { browserStore.set(key, value); },
    },
  });
  return { browserStore };
}

test('empty storage reads are missing data, and a later name still loads', async () => {
  let writes = 0;
  environment({
    getStorage: options => options.success({ data: '' }),
    setStorage: options => { writes += 1; options.success({ errMsg: 'setStorage:ok' }); },
  });
  assert.equal(await loadLocal('day-n.empty-object'), null);
  assert.equal(writes, 0, '空字符串不能被写回原生缓存');

  environment({
    getStorage: options => options.success(''),
    setStorage: options => options.success({ errMsg: 'setStorage:ok' }),
  });
  assert.equal(await loadLocal('day-n.empty-raw'), null);

  environment({
    getStorage: options => options.success({ data: '""' }),
    setStorage: options => options.success({ errMsg: 'setStorage:ok' }),
  });
  assert.equal(await loadLocal('day-n.empty-json'), null);

  environment({
    getStorage: options => options.fail({ errMsg: 'getStorage:fail', data: '' }),
  });
  assert.equal(await loadLocal('day-n.empty-fail'), null);

  environment({
    getStorage: options => options.fail({ errMsg: 'getStorage:fail data not found' }),
  });
  assert.equal(await loadLocal('day-n.missing'), null);

  environment({
    getStorage: options => options.fail({ errMsg: 'getStorage:fail unknown' }),
  });
  await assert.rejects(loadLocal('day-n.unknown'), /操作未完成/);

  environment({
    getStorage: options => options.fail({ errMsg: 'getStorage:fail permission denied' }),
  });
  await assert.rejects(loadLocal('day-n.permission'), /权限/);

  environment({
    getStorage: options => options.success({ data: '{broken' }),
  });
  await assert.rejects(loadLocal('day-n.broken'), /无法读取/);

  const nativeStore = new Map<string, string>();
  environment({
    getStorage: options => options.success({ data: nativeStore.get(String(options.key)) ?? '' }),
    setStorage: options => {
      nativeStore.set(String(options.key), String(options.data));
      options.success({ errMsg: 'setStorage:ok' });
    },
  });
  assert.equal(await loadLocal('day-n.name'), null);
  await saveLocal('day-n.name', { name: '小王' });
  assert.deepEqual(await loadLocal('day-n.name'), { name: '小王' });
  await saveLocal('day-n.name', { name: '' });
  assert.deepEqual(await loadLocal('day-n.name'), { name: '' });

  environment({
    getStorage: options => options.success({ data: '\uFEFF' + JSON.stringify(JSON.stringify({ name: '莎头' })) }),
    setStorage: options => options.success({ errMsg: 'setStorage:ok' }),
  });
  assert.deepEqual(await loadLocal('day-n.encoded'), { name: '莎头' });

  const { browserStore } = environment({
    getStorage: options => options.success({ data: '' }),
    setStorage: options => {
      nativeStore.set(String(options.key), String(options.data));
      options.success({ errMsg: 'setStorage:ok' });
    },
  });
  browserStore.set('day-n.migrated', JSON.stringify({ name: '老名字' }));
  assert.deepEqual(await loadLocal('day-n.migrated'), { name: '老名字' });
  assert.deepEqual(JSON.parse(nativeStore.get('day-n.migrated')!), { name: '老名字' });

  environment();
  assert.equal(await loadLocal('day-n.browser-missing'), null);
  await saveLocal('day-n.browser-name', { name: '莎头' });
  assert.deepEqual(await loadLocal('day-n.browser-name'), { name: '莎头' });
});
