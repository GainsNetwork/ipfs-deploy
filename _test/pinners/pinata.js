const test = require('ava')
const { hasRightFormat } = require('./helpers')
const proxyquire = require('proxyquire').noCallThru()

const getBuiltPinata = async (pinata) => {
  const api = await pinata.builder({
    apiKey: 'apiKey',
    secretApiKey: 'secretApiKey'
  })

  return { pinata, api }
}

const getPinataNoThrow = () => proxyquire('../../src/pinners/pinata', {
  'ipfs-http-client': {
    globSource: function * () {
      yield {}
    }
  },
  axios: {
    post: async () => ({
      data: {
        IpfsHash: 'QmHash'
      }
    })
  }
})

const getBuiltPinataNoThrow = async () => {
  const pinata = getPinataNoThrow()
  return getBuiltPinata(pinata)
}

const getBuiltPinataThrowAxios = async () => {
  const pinata = proxyquire('../../src/pinners/pinata', {
    axios: {
      post: () => { throw new Error() }
    }
  })

  return getBuiltPinata(pinata)
}

test('pinata has right format', t => {
  const pinata = getPinataNoThrow()
  t.is(hasRightFormat(pinata), true)
})

test('pinata builder throws with missing options', async t => {
  const pinata = getPinataNoThrow()
  await t.throwsAsync(() => pinata.builder({
    apiKey: 'somewhere'
  }))
})

test('pinata builder succeeds with all options', async t => {
  const pinata = getPinataNoThrow()
  await t.notThrowsAsync(() => pinata.builder({
    apiKey: 'apiKey',
    secretApiKey: 'secretApiKey'
  }))
})

test('pinata pinDir gets correct hash', async t => {
  const { pinata, api } = await getBuiltPinataNoThrow()
  t.is(await pinata.pinDir(api, 'dir'), 'QmHash')
})

test('pinata pinCid succeeds', async t => {
  const { pinata, api } = await getBuiltPinataNoThrow()
  await t.notThrowsAsync(() => pinata.pinCid(api))
})

test('pinata pinDir throws on HTTP request failure', async t => {
  const { pinata, api } = await getBuiltPinataThrowAxios()
  await t.throwsAsync(() => pinata.pinDir(api))
})

test('pinata pinCid throws on HTTP request failure', async t => {
  const { pinata, api } = await getBuiltPinataThrowAxios()
  await t.throwsAsync(() => pinata.pinCid(api))
})

test('pinata pinDir throws on file system failure', async t => {
  const { pinata, api } = await getBuiltPinata(proxyquire('../../src/pinners/pinata', {
    axios: {
      post: async () => {}
    }
  }))

  await t.throwsAsync(() => pinata.pinDir(api))
})