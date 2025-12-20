import http from 'k6/http';
import { baseURL } from './baseURL.js';

export function login(url = baseURL) {
    const payload = {
        username: 'priscila',
        password: '123456',
    };

    const res = http.post(
        `${url}/users/login`,
        JSON.stringify(payload),
        {
            headers: { 'Content-Type': 'application/json' },
        }
    );

    return res;
}