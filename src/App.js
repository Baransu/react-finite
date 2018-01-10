// @flow

import React, { Fragment } from 'react';
import fetchJsonp from 'fetch-jsonp';
import { Finite, Match, Switch } from './Finite';
import type { Chart } from './Finite';

type State = 'start' | 'loading' | 'error' | 'gallery' | 'photo';

const statechart: Chart<State> = {
  initial: 'start',
  states: {
    start: {
      on: { SEARCH: 'loading' }
    },
    loading: {
      on: {
        SEARCH_SUCCESS: 'gallery',
        SEARCH_FAILURE: 'error',
        CANCEL_SEARCH: 'gallery'
      }
    },
    error: {
      on: { SEARCH: 'loading' }
    },
    gallery: {
      on: {
        SEARCH: 'loading',
        SELECT_PHOTO: 'photo'
      }
    },
    photo: {
      on: { EXIT_PHOTO: 'gallery' }
    }
  }
};

const initialState = {
  items: [],
  searchText: 'Search',
  disableForm: false,
  photo: {
    media: {}
  }
};

type Action<S> = {
  type: string,
  payload: Object,
  nextState: S
};

function reducer(state = initialState, action: Action<State>) {
  if (action.type === 'SEARCH') {
    return { ...state, searchText: 'Searching...', disableForm: true };
  }

  if (action.type === 'SEARCH_SUCCESS') {
    return { ...initialState, items: action.payload.items };
  }

  if (action.type === 'SEARCH_FAILURE') {
    return { ...initialState, searchText: 'Try search again' };
  }

  if (action.type === 'SELECT_PHOTO') {
    console.log(action.payload);
    return { ...state, photo: action.payload.photo };
  }

  return state;
}

class Fetch extends React.Component<*> {
  componentDidMount() {
    fetchJsonp(this.props.url, { jsonpCallback: 'jsoncallback' })
      .then(res => res.json())
      .then(this.props.onSuccess)
      .catch(this.props.onFail);
  }

  render() {
    return null;
  }
}

class Gallery extends React.Component<{}, *> {
  state = { query: '' };

  handleSubmit = (transition: string => void) => (e: Object) => {
    e.preventDefault();
    transition('SEARCH');
  };

  handleChangeQuery = (e: Object) => this.setState({ query: e.target.value });

  getUrl = () => {
    const query = encodeURIComponent(this.state.query);
    return `https://api.flickr.com/services/feeds/photos_public.gne?lang=en-us&format=json&tags=${query}`;
  };

  render() {
    return (
      <Finite
        chart={statechart}
        reducer={reducer}
        render={machine => (
          <div className="ui-app" data-state={machine.state}>
            <form
              className="ui-form"
              onSubmit={this.handleSubmit(machine.transition)}
            >
              <input
                className="ui-input"
                disabled={machine.data.disableForm}
                placeholder="Search Flickr for photos..."
                type="search"
                value={this.state.query}
                onChange={this.handleChangeQuery}
              />
              <div className="ui-buttons">
                <button
                  className="ui-button"
                  disabled={machine.data.disableForm}
                >
                  {machine.data.searchText}
                </button>
                <Switch machine={machine}>
                  <Match
                    state="loading"
                    render={machine => (
                      <Fragment>
                        <Fetch
                          url={this.getUrl()}
                          onSuccess={({ items }) =>
                            machine.transition('SEARCH_SUCCESS', { items })
                          }
                          onFail={() => machine.transition('SEARCH_FAILURE')}
                        />
                        <button
                          className="ui-button"
                          type="button"
                          onClick={() => machine.transition('CANCEL_SEARCH')}
                        >
                          Cancel
                        </button>
                      </Fragment>
                    )}
                  />
                </Switch>
              </div>
            </form>

            <section className="ui-items">
              <Switch machine={machine}>
                <Match
                  state="error"
                  render={machine => (
                    <span className="ui-error">Uh oh, search failed.</span>
                  )}
                />
              </Switch>
              {machine.data.items.map((item, i) => (
                <img
                  alt=""
                  className="ui-item"
                  key={item.link}
                  src={item.media.m}
                  style={{ '--i': i }}
                  onClick={() =>
                    machine.transition('SELECT_PHOTO', { photo: item })
                  }
                />
              ))}
            </section>

            <Switch machine={machine}>
              <Match
                state="photo"
                render={machine => (
                  <section
                    className="ui-photo-detail"
                    onClick={() => machine.transition('EXIT_PHOTO')}
                  >
                    <img
                      alt=""
                      className="ui-photo"
                      src={machine.data.photo.media.m}
                    />
                  </section>
                )}
              />
            </Switch>
          </div>
        )}
      />
    );
  }
}

export default Gallery;
