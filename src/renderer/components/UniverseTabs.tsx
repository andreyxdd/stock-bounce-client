import { KeyboardEvent } from 'react';
import { Universe } from '../../types';
import useStore from '../hooks/useStore';

const tabs: Array<{ key: Universe; label: string }> = [
  { key: 'whole_market', label: 'Whole Market' },
  { key: 'macd_history', label: 'MACD History' },
];

const UniverseTabs = () => {
  const activeUniverse = useStore((state) => state.activeUniverse);

  const selectTab = (universe: Universe, focus = false) => {
    useStore.setState({ activeUniverse: universe });
    if (focus) document.getElementById(`${universe}-tab`)?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft')
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    selectTab(tabs[nextIndex].key, true);
  };

  return (
    <div className="universe-tabs" role="tablist" aria-label="Bounce universe">
      {tabs.map((tab, index) => (
        <button
          key={tab.key}
          id={`${tab.key}-tab`}
          type="button"
          role="tab"
          aria-label={tab.label}
          aria-selected={activeUniverse === tab.key}
          aria-controls={`${tab.key}-panel`}
          tabIndex={activeUniverse === tab.key ? 0 : -1}
          onClick={() => selectTab(tab.key)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {tab.label}
          <span className="tab-limit">Top 20</span>
        </button>
      ))}
    </div>
  );
};

export default UniverseTabs;
