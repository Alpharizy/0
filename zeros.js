import axios from 'axios';
import FormData from 'form-data';
import { promises as fs } from 'fs';
import readline from 'readline';
import chalk from 'chalk';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class ZerosWalletBot {
    constructor(proxy) {
        this.baseHeaders = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G9750 Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.114 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate',
            'origin': 'https://app.zeroswallet.com',
            'x-requested-with': 'com.zerofeewallet',
            'sec-fetch-site': 'same-site',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'referer': 'https://app.zeroswallet.com/',
            'accept-language': 'en-US,en;q=0.9'
        };
        this.token = '';
        this.userId = '';
        this.proxyAgent = proxy ? this.createProxyAgent(proxy) : null;
    }

    createProxyAgent(proxy) {
        try {
            console.log(chalk.blue('Parsing proxy:', proxy));

            if (proxy.startsWith('socks4') || proxy.startsWith('socks5')) {
                return new SocksProxyAgent(proxy);
            } else {
                return new HttpsProxyAgent(proxy);
            }
        } catch (error) {
            console.error(chalk.red('✖ Error creating proxy agent:'), error.message);
            return null;
        }
    }

    async createWallet() {
        try {
            const response = await axios.post(
                'https://api.zeroswallet.com/createwallet',
                {},
                { 
                    headers: this.baseHeaders, 
                    httpsAgent: this.proxyAgent,
                    proxy: false
                }
            );
            
            this.token = response.data.token || '';
            this.userId = response.data.user_id ? response.data.user_id.toString() : '';
            
            return {
                success: true,
                token: this.token,
                userId: this.userId,
                data: response.data
            };
        } catch (error) {
            return { success: false, error: error.response?.data || error.message };
        }
    }

    async addReferral(referralCode) {
        try {
            const form = new FormData();
            form.append('refcode', referralCode);
            form.append('token', this.token);

            const response = await axios.post(
                'https://api.zeroswallet.com/addreferral',
                form,
                { 
                    headers: { ...this.baseHeaders, ...form.getHeaders() }, 
                    httpsAgent: this.proxyAgent,
                    proxy: false
                }
            );
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data || error.message };
        }
    }

    async joinAirdrop() {
        try {
            const form = new FormData();
            form.append('token', this.token);
            form.append('id', '10');

            const response = await axios.post(
                'https://api.zeroswallet.com/airdrop-join',
                form,
                { 
                    headers: { ...this.baseHeaders, ...form.getHeaders() }, 
                    httpsAgent: this.proxyAgent,
                    proxy: false
                }
            );
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data || error.message };
        }
    }

    async getWalletInfo() {
        try {
            const form = new FormData();
            form.append('id', this.userId || '');

            const response = await axios.post(
                'https://api.zeroswallet.com/get/mywallet',
                form,
                { 
                    headers: { ...this.baseHeaders, ...form.getHeaders() }, 
                    httpsAgent: this.proxyAgent,
                    proxy: false
                }
            );
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data || error.message };
        }
    }

    async saveWallet(walletData) {
        try {
            let wallets = [];
            try {
                const data = await fs.readFile('wallets.json', 'utf8');
                wallets = JSON.parse(data);
            } catch (e) {}
            wallets.push(walletData);
            await fs.writeFile('wallets.json', JSON.stringify(wallets, null, 2));
        } catch (error) {
            console.error(chalk.red('✖ Failed to save wallet:'), error.message);
        }
    }
}

async function loadReferralCodes() {
    try {
        const data = await fs.readFile('code.txt', 'utf8');
        return data.split('\n').map(code => code.trim()).filter(code => code);
    } catch (error) {
        console.error(chalk.red('✖ Error loading code.txt:'), error.message);
        return ['c8d4e2cfe4'];
    }
}

async function loadProxies() {
    try {
        const data = await fs.readFile('proxies.txt', 'utf8');
        return data.split('\n').map(proxy => proxy.trim()).filter(proxy => proxy);
    } catch (error) {
        console.error(chalk.red('✖ Error loading proxies.txt:'), error.message);
        return [];
    }
}

async function runBot(count) {
    console.log(chalk.cyan.bold('======================================='));
    console.log(chalk.cyan.bold('  Auto Reff Zeros - Airdrop Insiders  '));
    console.log(chalk.cyan.bold('======================================='));
    console.log(chalk.yellow(`Target: Create ${count} wallets\n`));

    const referralCodes = await loadReferralCodes();
    const proxies = await loadProxies();
    const wallets = [];

    for (let i = 0; i < count; i++) {
        const proxy = proxies[i % proxies.length] || null;
        const refCode = referralCodes[i % referralCodes.length];

        console.log(chalk.cyan(`\n[Wallet ${i + 1}/${count}]`));
        console.log(chalk.gray('------------------------'));
        if (proxy) console.log(chalk.magenta(`Using proxy: ${proxy}`));

        const bot = new ZerosWalletBot(proxy);

        console.log(chalk.yellow('→ Creating wallet...'));
        const walletResult = await bot.createWallet();
        if (!walletResult.success) {
            console.log(chalk.red('✖ Failed:'), walletResult.error);
            continue;
        }
        console.log(chalk.green('✔ Success'), `UserID: ${walletResult.userId}`);

        console.log(chalk.yellow(`→ Adding referral (${refCode})...`));
        const refResult = await bot.addReferral(refCode);
        console.log(refResult.success ? chalk.green('✔ Success') : chalk.red('✖ Failed:'), refResult.error || '');

        console.log(chalk.yellow('→ Joining airdrop...'));
        const airdropResult = await bot.joinAirdrop();
        console.log(airdropResult.success ? chalk.green('✔ Success') : chalk.red('✖ Failed:'), airdropResult.error || '');

        await bot.saveWallet(walletResult);

        await delay(1000);
    }

    console.log(chalk.cyan.bold('\nBot Selesai!'));
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

rl.question(chalk.white('Berapa wallet yang ingin dibuat? '), (answer) => {
    const count = parseInt(answer);
    if (isNaN(count) || count <= 0) {
        console.log(chalk.red('✖ Masukkan angka valid!'));
        rl.close();
        return;
    }
    
    runBot(count).then(() => rl.close());
});
