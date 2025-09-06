const request = require('supertest');
const { expect } = require('chai');
const { query } = require('express');

describe('Testes de Transferência', () => {
    it.only('Validar que é possível transferir grana entre duas contas', async () => {
        const resposta = await request('http://localhost:4000/graphql')
            .post('/graphql')
            .send({
                query: `
                mutation LoginUser($username: String!, $password: String!) { 
                    loginUser(username: $username, password: $password) { 
                        token
                    }
                }`,
                variables: {
                    username: 'julio',
                    password: '123456'
                }
            });

        // console.log(resposta.body.data.loginUser.token);

        const respostaTransferencia = await request('http://localhost:4000/graphql')
            .post('')
            .set('Authorization', `Bearer ${resposta.body.data.loginUser.token}`)
            .send({
                query: `
                mutation CreateTransfer($from: String!, $to: String!, $value: Float!) {
                    createTransfer(from: $from, to: $to, value: $value) {
                        date
                        from
                        to
                        value
                    }
                }
            `,
                variables: {
                    from: 'julio',
                    to: 'priscila',
                    value: 15
                }
            });
        expect(respostaTransferencia.status).to.equal(200);
    });
});