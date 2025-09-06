const request = require('supertest');
const { expect, use } = require('chai');
require('dotenv').config();

const chaiExclude = require('chai-exclude');
use(chaiExclude);

describe('Testes de Transferência', () => {

    before(async () => {
        const loginUser = require('../fixture/requisicoes/login/loginUser.json');
        const respostaLogin = await request(process.env.BASE_URL_GRAPHQL)
            .post('')
            .send(loginUser);

        token = respostaLogin.body.data.loginUser.token;
    });

    beforeEach(() =>{
        createTransfer = require('../fixture/requisicoes//transferencia/createTransfer.json');
    })

    it('Validar que é possível transferir grana entre duas contas', async () => {
        const respostaEsperada = require('../fixture/respostas/transferencia/validarQueEPossivelTransferirGranaEntreDuasContas.json');
        const respostaTransferencia = await request(process.env.BASE_URL_GRAPHQL)
            .post('')
            .set('Authorization', `Bearer ${(token)}`)
            .send(createTransfer);

        expect(respostaTransferencia.status).to.equal(200);
        expect(respostaTransferencia.body.data.createTransfer)
            .excluding('date')
            .to.eql(respostaTransferencia.body.data.createTransfer);
    });

    it('Validar que não tem saldo suficiente', async () => {

        createTransfer.variables.value = 10126;

        const respostaTransferenciaSemSaldo = await request(process.env.BASE_URL_GRAPHQL)
            .post('')
            .set('Authorization', `Bearer ${(token)}`)
            .send(createTransfer);
            
        expect(respostaTransferenciaSemSaldo.status).to.equal(200);
        expect(respostaTransferenciaSemSaldo.body).to.have.property('errors');
        expect(respostaTransferenciaSemSaldo.body.errors[0].message).to.include('Saldo insuficiente');
    });
});