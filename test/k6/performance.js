import http from 'k6/http';
import { sleep, check, group } from 'k6';

export const options = {
    vus: 10,
    duration: '10s',
};

export default function () {

    let loginRes;

    // Login para obter o token
    group('Login para obter o token', () => {
        loginRes = http.post(
            'http://localhost:3000/users/login',
            JSON.stringify({
                username: 'priscila',
                password: '123456'
            }),
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        check(loginRes, {
            "status deve ser igual a 200": (r) => r.status === 200
        });

    });

    // extrai token com checagem
    const loginStatus = loginRes && loginRes.status;
    if (loginStatus !== 200) {
        // evita tentar usar .json() se o login falhou
        console.error(`Login falhou com status ${loginStatus}. Body: ${loginRes ? loginRes.body : 'sem resposta'}`);
        return; // encerra a VU nesta iteração
    }

    const token = loginRes.json().token;
    if (!token) {
        console.error('Token não obtido:', loginRes.body);
        return;
    }

    // Requisição de transferência com usuários válidos
    group('Requisição de transferência com usuários válidos', () => {
        const res = http.post(
            'http://localhost:3000/transfers',
            JSON.stringify({
                from: 'priscila',
                to: 'julio',
                value: 1
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        check(res, {
            'status é 201': (r) => r.status === 201
        });

        if (res.status !== 201) {
            console.error('Transferência não concluída:', res.status, res.body);
        }
    });

    group('Simulando o pensamento do usuário', () => {
        sleep(1);
    });

}
