import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { login } from './helpers/login.js';
import { baseURL } from './helpers/baseURL.js';
import { Faker } from 'k6/x/faker';
import { Trend } from 'k6/metrics';

// Métrica personalizada para monitorar a duração das requisições de transferência
export const postTransferDurationTrend = new Trend('transfer_duration');

export const options = {
    stages: [
        { duration: '15s', target: 2 }, // ramp-up subir para 2 usuários em 15 segundos
        { duration: '30s', target: 3 }, // stay em 3 usuários por 30 segundos
        { duration: '15s', target: 0 }, // ramp-down descer para 0 usuários em 15 segundos
    ],

    thresholds: {
        http_req_duration: ['p(85) < 3000'], // 85% deve ser menor que 3000ms
        http_req_failed: ['rate<0.4'], // taxa de falha deve ser menor que 40%
    }
};

// usuário importado de `helpers/login.js`
export default function () {

    let loginRes;

    group('Login para obter o token', () => {
        loginRes = login();
        check(loginRes, {
            'status deve ser igual a 200': (r) => r.status === 200,
        });
    });

    // evita usar .json() se o login falhar
    const loginStatus = loginRes && loginRes.status;
    if (loginStatus !== 200) {
        console.error(
            `Login falhou com status ${loginStatus}. Body: ${loginRes ? loginRes.body : 'sem resposta'}`
        );
        return;
    }

    const token = loginRes.json().token;
    // console.log('Token obtido:', token);
    if (!token) {
        // console.error('Token não obtido:', loginRes.body);
        return;
    }

    // Requisição de transferência com usuários válidos
    group('Requisição de transferência com usuários válidos', () => {
        const res = http.post(
            `${baseURL}/transfers`,
            JSON.stringify({
                from: 'priscila',
                to: 'julio',
                value: 1,
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        check(res, {
            'Transferência concluída com status 201': (r) => r.status === 201,
        });

        postTransferDurationTrend.add(res.timings.duration);

    });

    // Requisição de transferência com usuários inválidos
    group('Requisição de transferência com usuários inválidos', () => {
       const faker = new Faker();
       const toInvalido = faker.person.firstName();

        const res = http.post(
            `${baseURL}/transfers`,
            JSON.stringify({
                from: 'priscila',
                to: toInvalido,
                value: 1,
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        // console.log('Usuário inválido usado:', toInvalido);

        check(res, {
            'Transferência para usuário inválido retorna 400': (r) => r.status === 400,
        });
    });

    // Simula tempo de pensamento do usuário
    group('Simulando o pensamento do usuário', () => {
        sleep(1);
    });
}