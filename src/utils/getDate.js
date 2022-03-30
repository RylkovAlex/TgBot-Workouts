module.exports = (dateString) => {
  const date = new Date(dateString);
  const options = {
    year: '2-digit',
    month: '2-digit',
    day: 'numeric',
  };
  return date.toLocaleDateString('ru', options);
};
