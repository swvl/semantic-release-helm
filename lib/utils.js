const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');
const execa = require('execa');

async function gitGetModifiedFilesSince(oldCommitRef, newCommitRef, logger) {
    try {
        let args
        if (oldCommitRef) {
            args = ['--no-pager', 'diff', `${oldCommitRef}..${newCommitRef}`, '--name-only']
        } else {
            args = ['--no-pager', 'ls-tree', '--full-tree', '-r', newCommitRef, '--name-only']
        }
        const { stdout } = await execa('git', args)
        return stdout.split('\n')
    } catch (error) {
        logger.error(error.shortMessage || error.message)
        return false
    }
}

module.exports = {
    gitGetModifiedFilesSince,
};
