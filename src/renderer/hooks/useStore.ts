import create from 'zustand';
import { Universe } from '../../types';

export interface IState {
  selectedDate: string | undefined;
  lookback: number;
  activeUniverse: Universe;
}

const initialState: IState = {
  selectedDate: undefined,
  lookback: 20,
  activeUniverse: 'whole_market',
};

const useStore = create<IState>(() => ({ ...initialState }));

export default useStore;
