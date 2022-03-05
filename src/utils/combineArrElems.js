module.exports = (arr, numberToCombine, mappper) => {
  return arr.reduce((result, element) => {
    const last = result[result.length - 1];
    if (!last || last.length === numberToCombine) {
      result.push([mappper ? mappper(element) : element]);
    } else {
      last.push(mappper ? mappper(element) : element)
    }
    return result;
  }, []);
};
