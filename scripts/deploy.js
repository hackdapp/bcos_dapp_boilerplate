
const path = require('path');
const fs = require('fs');
const { Configuration, Web3jService, CompileService } = require('nodejs-sdk/packages/api');

const config = new Configuration(path.join(__dirname, '../conf/config.json'));
const compileService = new CompileService(config);
const web3jService = new Web3jService(config);
const abi_dir = path.join(__dirname, '../server/contracts');
let deployed_contract_dir = path.join(abi_dir, `deployed_contract.json`);

function deploy(contractName, parameters, output_dir) {
  if (!contractName.endsWith('.sol')) {
      contractName += '.sol';
  }

  const contractPath = path.join(__dirname, `../contracts/${contractName}`);
  if (!fs.existsSync(contractPath)) {
      throw new Error(`${contractName} doesn't exist`);
  }

  let contractClass = compileService.compile(contractPath);
  if (!fs.existsSync(abi_dir)) {
      fs.mkdirSync(abi_dir, { recursive: true });
  }

  contractName = path.basename(contractName);
  contractName = contractName.substring(0, contractName.indexOf('.'));
  let abiPath = path.join(abi_dir, `${path.basename(contractName)}.abi`);
  let binPath = path.join(abi_dir, `${path.basename(contractName)}.bin`);

  try {
      fs.writeFileSync(abiPath, JSON.stringify(contractClass.abi));
      fs.writeFileSync(binPath, contractClass.bin);
  } catch (error) {}

  return web3jService.deploy(contractClass.abi, contractClass.bin, parameters).then((result) => {
      if (result.status === '0x0') {
          let contractAddress = result.contractAddress;
          let addressPath = path.join(abi_dir, `${path.basename(contractName, '.sol')}.address`);

          const rtn_result = {
            contract_name: contractName,
            status: result.status,
            contractAddress,
            transactionHash: result.transactionHash
          };
          try {
              fs.appendFileSync(addressPath, contractAddress + '\n');
              fs.writeFileSync(deployed_contract_dir, JSON.stringify(rtn_result, null, 4));
          } catch (error) {}

          return rtn_result;
      }

      return {
          status: result.status,
          transactionHash: result.transactionHash
      };
  });
}

const contract_name = process.argv[2];
const param = process.argv[3] || [];
deploy(contract_name, param).then((res) => {
  console.log(JSON.stringify(res, null, 2))
})

