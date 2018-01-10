// @flow

import React from 'react';
import { Machine } from 'xstate';

type TranstionFn = (string, ?Object) => void;

export type Chart<S> = {
  initial: S,
  states: { [S]: { on: { [string]: S } } }
};

type MachineT = {
  state: string,
  transition: TranstionFn,
  data: Object
};

type RenderFn = MachineT => React$Element<*>;

type FiniteProps<S> = {
  chart: Chart<S>,
  reducer: (any, any) => any,
  render: RenderFn
};

type FiniteState = {
  data: Object,
  machineState: string
};

export class Finite<S> extends React.Component<FiniteProps<S>, FiniteState> {
  machine = Machine(this.props.chart);

  state = {
    machineState: this.machine.initialState.value,
    data: this.props.reducer(undefined, {
      type: '@@INIT',
      nextState: this.props.chart.initial
    })
  };

  transition: TranstionFn = (type, payload) => {
    const { reducer } = this.props;
    const { data, machineState } = this.state;

    const nextState = this.machine.transition(machineState, type).toString();

    const action = { type, payload, nextState };
    this.setState({ data: reducer(data, action), machineState: nextState });
  };

  render() {
    return this.props.render({
      state: this.state.machineState,
      data: this.state.data,
      transition: this.transition
    });
  }
}

type SwitchProps = {
  machine: Object,
  children: React$Element<*>
};

export class Switch extends React.Component<SwitchProps> {
  render() {
    const { children, machine } = this.props;

    let match = null;
    React.Children.forEach(children, child => {
      if (match) return;
      if (match == null && React.isValidElement(child)) {
        if (child.props.state === machine.state) {
          match = child;
        }
      }
    });

    return match ? React.cloneElement(match, { machine }) : null;
  }
}

const isEmptyChildren = children => React.Children.count(children) === 0;

type MatchProps = {
  state: string,
  component?: any,
  render?: RenderFn,
  children?: RenderFn
};

export class Match extends React.Component<MatchProps> {
  render() {
    const {
      state,
      component,
      // $FlowFixMe - it's explicitly passed by Switch while match
      machine,
      render,
      children
    } = this.props;

    const match = machine.state === state;
    const props = machine;

    if (component) return match ? React.createElement(component, props) : null;

    if (render) return match ? render(props) : null;

    if (typeof children === 'function') return children(props);

    if (children && !isEmptyChildren(children))
      return React.Children.only(children);

    return null;
  }
}
