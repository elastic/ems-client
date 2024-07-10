/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Script that will check the current package.json dependencies
against Kibana (using BUILDKITE_BRANCH to determine the branch)
and exits with a 1 status code if, for any shared dependency, 
EMS Client is behind */

const fs = require('node:fs');
const semver = require('semver');

const DEFAULT_BRANCH = 'main';
const branch = process.env.KIBANA_BRANCH || DEFAULT_BRANCH;
const kibanaPackageUrl = `https://raw.githubusercontent.com/elastic/kibana/${branch}/package.json`;

const processDependency = function (dependency, srcDeps, dstDeps, dstDevDeps) {
  if (!(dependency in dstDeps) && !(dependency in dstDevDeps)) {
    return true;
  }
  const source = srcDeps[dependency].replace('^', '');
  const destination = dstDeps[dependency] || dstDevDeps[dependency];

  if (semver.satisfies(source, destination)) {
    return true;
  }

  if ( dependency in dstDevDeps){
    console.log(`⚠  ${dependency}: ${source} vs ${destination}`);
    return true
  }

  console.log(`🛑  ${dependency}: ${source} vs ${destination}`);
  return false;
};

const main = async function () {
  const kibanaPackage = await fetch(kibanaPackageUrl);
  const kibanaPackageJson = await kibanaPackage.json();
  const kibanaDeps = kibanaPackageJson['dependencies'];
  const kibanaDevDeps = kibanaPackageJson['devDependencies'];

  const emsClientPackageJson = JSON.parse(fs.readFileSync('package.json'));
  const emsClientDeps = {
    ...emsClientPackageJson['dependencies'],
    ...emsClientPackageJson['devDependencies']
  };

  console.log(`ems-client@${emsClientPackageJson['version']}`);
  console.log(`kibana@${kibanaPackageJson['version']}`);

  const results = Object.keys(emsClientDeps).map((dep) =>
    processDependency(dep, emsClientDeps, kibanaDeps, kibanaDevDeps)
  );

  process.exit(results.every(r => r) ? 0 : 1);
};

main()
  .then(console.log)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
