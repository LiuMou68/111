import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        const rpcUrl = 'http://localhost:8545';
        const web3 = new Web3(rpcUrl);
        const contractAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

        console.log('Checking contract at:', contractAddress);

        // 1. Get Code
        const code = await web3.eth.getCode(contractAddress);
        console.log('Code length:', code.length);
        
        // 2. Check for selectors
        const mintSelector = web3.eth.abi.encodeFunctionSignature('mintCertificate(string,string)');
        console.log('Mint Selector:', mintSelector);
        
        const testSelector = web3.eth.abi.encodeFunctionSignature('test()');
        console.log('Test Selector:', testSelector);

        if (code.includes(mintSelector.slice(2))) {
            console.log('Mint selector FOUND in bytecode!');
        } else {
            console.error('Mint selector NOT FOUND in bytecode!');
        }

        if (code.includes(testSelector.slice(2))) {
            console.log('Test selector FOUND in bytecode!');
        } else {
            console.error('Test selector NOT FOUND in bytecode!');
        }

    } catch (error) {
        console.error('Debug failed:', error);
    }
}

main();
