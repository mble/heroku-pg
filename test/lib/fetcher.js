'use strict'
/* global describe beforeEach afterEach it */

const nock = require('nock')
const expect = require('unexpected')
const proxyquire = require('proxyquire')
const resolver = {}
const fetcher = proxyquire('../../lib/fetcher', {'heroku-cli-addons': {resolve: resolver}})
const Heroku = require('heroku-client')
const cli = require('heroku-cli-util')

describe('fetcher', () => {
  let api

  beforeEach(() => {
    cli.heroku = new Heroku()
    api = nock('https://api.heroku.com:443')
  })

  afterEach(() => {
    nock.cleanAll()
    api.done()
  })

  describe('addon', () => {
    it('returns addon attached to app', () => {
      resolver.attachment = (app, db) => {
        if (app === 'myapp' && db === 'DATABASE_URL') {
          return Promise.resolve({addon: {name: 'postgres-1'}})
        }
        return Promise.resolve()
      }
      return fetcher.addon('myapp', 'DATABASE_URL')
      .then(addon => {
        expect(addon.name, 'to equal', 'postgres-1')
      })
    })
  })

  describe('all', () => {
    it('returns all addons attached to app', () => {
      let plan = {name: 'heroku-postgresql:hobby-dev'}
      let service = {name: 'heroku-postgresql'}
      let attachments = [
        {addon: {id: 100, name: 'postgres-1', addon_service: service, plan, config_vars: ['DATABASE_URL', 'HEROKU_POSTGRESQL_PINK_URL']}},
        {addon: {id: 101, name: 'postgres-2', addon_service: service, plan, config_vars: ['HEROKU_POSTGRESQL_BRONZE_URL']}}
      ]
      api.get('/apps/myapp/addon-attachments').reply(200, attachments)

      return fetcher.all('myapp')
      .then(addons => {
        expect(addons[0], 'to satisfy', {name: 'postgres-1'})
        expect(addons[1], 'to satisfy', {name: 'postgres-2'})
        expect(addons.length, 'to equal', 2)
      })
    })
  })
})
