const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');
const execa = require('execa');

async function gitGetModifiedFilesSince(oldCommitRef, newCommitRef, logger) {
    try {
        const { stdout } = await execa('git', ['--no-pager', 'diff', `${oldCommitRef}..${newCommitRef}`, '--name-only'])
        return stdout.split('\n')
    } catch (error) {
        logger.error(error.shortMessage || error.message)
        return false
    }
}

module.exports = {
    gitGetModifiedFilesSince,
};
