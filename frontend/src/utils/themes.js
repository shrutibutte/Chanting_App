export const THEMES = {
 peach: {
    id: 'peach',
    name: 'Peach (Default)',
    background: '#FFFDF9',
    card: '#FFFFFF',
    accent: '#FF6B35',
    primaryText: '#1F2937',
    secondaryText: '#8D99AE',
    border: '#EDF2F4',
    success: '#4CAF50',
    warning: '#FFC107',
    intensityLevels: {
      none: '#ECEFF1',
      low: '#FFE7D8',
      medium: '#FFB899',
      high: '#FF8A65',
      completed: '#FF6B35'
    }
  },

  darkTemple: {
    id: 'darkTemple',
    name: 'Dark Temple',
    background: '#0F1115',
    card: '#1A1D23',
    accent: '#FFD166',
    primaryText: '#FFFFFF',
    secondaryText: '#B0B8C5',
    border: '#2A2E36',
    success: '#06D6A0',
    warning: '#FF5A5F',
    intensityLevels: {
      none: '#2A2E36',
      low: '#4D4128',
      medium: '#8C7338',
      high: '#C4A850',
      completed: '#FFD166'
    }
  },



  vrindavanGreen: {
    id: 'vrindavanGreen',
    name: 'Vrindavan Green',
    background: '#F4FBF6',
    card: '#FFFFFF',
    accent: '#2E7D32',
    primaryText: '#1B4332',
    secondaryText: '#5B7C6F',
    border: '#DDEFE2',
    success: '#22C55E',
    warning: '#F59E0B',
    intensityLevels: {
      none: '#ECEFF1',
      low: '#D8F0DA',
      medium: '#A8D5AC',
      high: '#66BB6A',
      completed: '#2E7D32'
    }
  },

  saffron: {
    id: 'saffron',
    name: 'Saffron',
    background: '#FFF8F1',
    card: '#FFFFFF',
    accent: '#F57C00',
    primaryText: '#4E1A00',
    secondaryText: '#8A5A2B',
    border: '#F4DFC8',
    success: '#22C55E',
    warning: '#F59E0B',
    intensityLevels: {
      none: '#ECEFF1',
      low: '#FFE7CC',
      medium: '#FFC980',
      high: '#FFA040',
      completed: '#F57C00'
    }
  },

  lotusPink: {
    id: 'lotusPink',
    name: 'Lotus Pink',
    background: '#FFF5F8',
    card: '#FFFFFF',
    accent: '#EC709A',
    primaryText: '#4A1E2A',
    secondaryText: '#A86B7F',
    border: '#F6DCE5',
    success: '#22C55E',
    warning: '#F59E0B',
    intensityLevels: {
      none: '#ECEFF1',
      low: '#FDDCE7',
      medium: '#F7A8BF',
      high: '#F283A8',
      completed: '#EC709A'
    }
  },
  krishnaBlue: {
    id: 'krishnaBlue',
    name: 'Krishna Blue',
    background: '#F0F8FF',
    card: '#FFFFFF',
    accent: '#118AB2',
    primaryText: '#073B4C',
    secondaryText: '#457B9D',
    border: '#E2ECEF',
    success: '#06D6A0',
    warning: '#E63946',
    intensityLevels: {
      none: '#E2E8F0',
      low: '#C2E4F0',
      medium: '#85C9DF',
      high: '#5CAECF',
      completed: '#118AB2'
    }
  }
};




export const getTheme = (themeId) => {
  return THEMES[themeId] || THEMES.peach;
};
