// TODO: README at js/base directory level, point to it from main README
// TODO: create a state injector for test mocks

// const minidux = require('minidux');
const deepFreeze = require('deep-freeze');
const reducers = require('./reducers.es6.js');
const EventEmitter2 = require('eventemitter2');


/**
 * `_store` is our minidux state machine
 * Its api is not publicly exposed. Developers must use public api below.
 * @api private
 */
var _store = null;


/**
 * Creates a minidux reducer for each caller.
 * The base model will be its caller in most cases.
 * @param {string} modelName - must be unique
 * @param {object} initialState - initial state of model
 * @api public
 */
function register (modelName) {
    if (typeof modelName !== 'string') { throw new Error('modelName must be a string'); }
    if (reducers.asyncReducers[modelName]) { throw new Error ('modelName must be unique, no duplicates'); }

    reducers.add(modelName);
    const combinedReducers = reducers.combine();

    if (!_store) {
        _store = _createStore(combinedReducers);
        _store.subscribe((state) => {
            state = deepFreeze(state); // make state immutable before publishing
            _publishChange(state); // publish changes to subscribers
        });
    } else {
        // update reducers to include the newest registered here
        _store.replaceReducer(combinedReducers);
    }
}


/**
 * Updates state of store by model name, which is mapped to
 * a corresponding reducer in the store.
 * Although api is public, most of what you need to do can be
 * done with model.set() and model.clear() instead of directly here
 * @param {string} modelName
 * @param {object} change - { attribute, value, lastValue }
 * @param {object} attributes - object representing model's direct properties
 * @api public
 */
function update (modelName, change, attributes) {
  const actionType = reducers.getActionType(modelName);
  _store.dispatch({
    type: actionType,
    change: change,
    attributes: attributes
  });
}


/**
 * Broadcasts state change events out to subscribers
 * @api public, but exposed as `subscribe` for clarity
 */
const _publisher = new EventEmitter2();
_publisher.setMaxListeners(100); // EventEmitter2 default of 10 is too low
/**
 * Emits state change events via _publisher
 * @api private
 */
function _publishChange (state) {

  Object.keys(state).forEach((key) => {
      if (state[key].change) {
          console.info(`STORE PUBLISH MODEL change:${key}`, state[key]);
          _publisher.emit(`change:${key}`, state[key]);
      }
  });

}


/**
 * Remove reducer that corresponds to modelName from store.
 * @param {string} modelName
 * @api public
 */
function remove (modelName) {
  if (reducers.remove(modelName)) {
      const combinedReducers = reducers.combine();
      _store.replaceReducer(combinedReducers);
  }
}


// public api
module.exports = {
  register: register,
  update: update,
  subscribe: _publisher,
  remove: remove
};





const isPlainObject = require('is-plain-object');

function _createStore (reducer) {
  if (!reducer || typeof reducer !== 'function') throw new Error('reducer must be a function')

  // if (typeof initialState === 'function' && typeof enhancer === 'undefined') {
  //   enhancer = initialState
  //   initialState = undefined
  // }

  // if (typeof enhancer !== 'undefined') {
  //   if (typeof enhancer !== 'function') {
  //     throw new Error('enhancer must be a function.')
  //   }

  //   return enhancer(createStore)(reducer, initialState)
  // }

  var initialState = initialState || {}
  var state = initialState
  var listener = null
  var isEmitting = false

  function dispatch (action) {
    if (!action || !isPlainObject(action)) throw new Error('action parameter is required and must be a plain object')
    if (!action.type || typeof action.type !== 'string') throw new Error('type property of action is required and must be a string')
    if (isEmitting) throw new Error('modifiers may not emit actions')

    isEmitting = true
    state = reducer(state, action)
    if (listener) listener(state)
    isEmitting = false
    return action
  }

  function subscribe (cb) {
    if (!cb || typeof cb !== 'function') throw new Error('listener must be a function')
    listener = cb
  }

  function replaceReducer (next) {
    if (typeof next !== 'function') throw new Error('new reducer must be a function')
    reducer = next
  }

  // function getState () {
  //   return state
  // }

  dispatch({ type: '@@createStore/INIT' })

  return {
    dispatch: dispatch,
    subscribe: subscribe,
    // getState: getState,
    replaceReducer: replaceReducer
  }
}
