//Bibliotecas
const request = require('supertest');
const { expect } = require('chai');

describe('Transfer Mutation - GraphQL', () => {

    let token;

    beforeEach(async () => {
            const resposta = await request('http://localhost:4000')
                .post('/graphql')
                .send({
                    query: `
                        mutation LoginUser($username: String!, $password: String!) {
                            loginUser(username: $username, password: $password) {
                                token
                            }
                        }
                    `,
                    variables: {
                        username: "julio",
                        password: "123456"
                    }
                })

        token = resposta.body.data.loginUser.token
    })

    it('Quando informar dados válidos a transferência sera realizada com sucesso', async () => {
        const resposta = await request('http://localhost:4000')
            .post('/graphql')
            .set('Authorization', 'Bearer ' + token)
            .send({
                query: `
                    mutation CreateTransfer($from: String!, $to: String!, $value: Float!) {
                        createTransfer(from: $from, to: $to, value: $value) {
                            from
                            to
                            value
                        }
                    }
                `,
                variables: {
                    from: "julio",
                    to: "priscila",
                    value: 10
                }
            })

        expect(resposta.status).to.be.equal(200)
        expect(resposta.body.data.createTransfer).to.have.property('from', 'julio')
        expect(resposta.body.data.createTransfer).to.have.property('to', 'priscila')
        expect(resposta.body.data.createTransfer).to.have.property('value', 10)
    })

    it('Quando não tenho saldo suficiente para transferencia, recebo erro saldo insuficiente', async () => {
        const resposta = await request('http://localhost:4000')
            .post('/graphql')
            .set('Authorization', 'Bearer ' + token)
            .send({
                query: `
                    mutation CreateTransfer($from: String!, $to: String!, $value: Float!) {
                        createTransfer(from: $from, to: $to, value: $value) {
                            from
                            to
                            value
                        }
                    }
                `,
                variables: {
                    from: "julio",
                    to: "priscila",
                    value: 500000000
                }
            })

        expect(resposta.status).to.be.equal(200)
        expect(resposta.body).to.have.property('errors');
        expect(resposta.body.errors[0].message).to.include('Saldo insuficiente');

    })   
    
    it('Quando não realizo autenticação, recebo erro de autenticação', async () => {
        const resposta = await request('http://localhost:4000')
            .post('/graphql')
            .send({
                query: `
                    mutation CreateTransfer($from: String!, $to: String!, $value: Float!) {
                        createTransfer(from: $from, to: $to, value: $value) {
                            from
                            to
                            value
                        }
                    }
                `,
                variables: {
                    from: "julio",
                    to: "priscila",
                    value: 10
                }
            });

        expect(resposta.status).to.be.equal(200);
        expect(resposta.body).to.have.property('errors');
        expect(resposta.body.errors[0].message).to.include('Autenticação obrigatória');
    });
})