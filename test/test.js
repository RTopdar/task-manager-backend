

import { expect } from 'chai';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../src/server.js'; // Adjust the path as necessary

// Mock the db object
const db = {
  collection: sinon.stub().returnsThis(),
  findOne: sinon.stub(),
};

// Mock process.env
process.env.SECRET = 'testsecret';

describe('verifyToken', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    next = sinon.stub();
  });

  it('should return 401 if no token is provided', () => {
    verifyToken(req, res, next);
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledWith({ message: 'No token provided' })).to.be.true;
  });

  it('should return 401 if token is invalid', () => {
    req.headers['authorization'] = 'Bearer invalidtoken';
    sinon.stub(jwt, 'verify').callsFake((token, secret, callback) => {
      callback(new Error('Invalid token'), null);
    });

    verifyToken(req, res, next);
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledWith({
      message: 'Failed to authenticate token | Error: Invalid token',
    })).to.be.true;

    jwt.verify.restore();
  });

  it('should return 401 if token is expired', () => {
    req.headers['authorization'] = 'Bearer validtoken';
    sinon.stub(jwt, 'verify').callsFake((token, secret, callback) => {
      callback(null, { userId: 'testuser', exp: Math.floor(Date.now() / 1000) - 10 });
    });

    verifyToken(req, res, next);
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledWith({ message: 'Token has expired' })).to.be.true;

    jwt.verify.restore();
  });


});