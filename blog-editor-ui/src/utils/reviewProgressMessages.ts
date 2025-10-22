export const getProgressMessages = (elapsedSeconds: number): string[] => {
  if (elapsedSeconds < 30) {
    return [
      'Analyzing your content...',
      'Checking for writing improvements...',
      'Reviewing grammar and style...'
    ];
  } else if (elapsedSeconds < 60) {
    return [
      'Deep analysis in progress...',
      'Generating personalized suggestions...',
      'Reviewing tone and clarity...',
      'Almost done, finalizing results...'
    ];
  } else {
    return [
      'Complex analysis taking a bit longer...',
      'Processing final recommendations...',
      'Quality review in progress...',
      'Just a few more moments...'
    ];
  }
};

export const getTimeBasedMessage = (elapsedSeconds: number): string => {
  if (elapsedSeconds < 30) {
    return 'This usually takes 1-2 minutes.';
  } else if (elapsedSeconds < 90) {
    return 'Analysis is taking a bit longer than usual, but still processing.';
  } else {
    return 'Complex content may take up to 3 minutes to analyze thoroughly.';
  }
};
