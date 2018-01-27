/**
 * getDictChanges - finds what keys were changed in dictionary
 *
 * @param  {dictionary} theNew        new dictionary conten
 * @param  {dictionary} theOld = null original dictionary content
 * @return {dictionary}               return dictionary with two keys "-" are deleted keys, "+" are new and changed
 */
function getDictChanges(theNew, theOld = null) {
  if (!(theOld instanceof Object))
    theOld = {};

  function getDeletedKeys(theNew, theOld) {
    let deletedKeys = {};
    for (let key of Object.keys(theOld)) {
      if (!(key in theNew))
        deletedKeys[key] = null;
      else if ((theOld[key] instanceof Object) && (theNew[key] instanceof Object)) {
        let subDeleted = getDeletedKeys(theNew[key], theOld[key]);
        if (subDeleted !== null)
          deletedKeys[key] = subDeleted;
      }
    }
    return Object.keys(deletedKeys).length > 0 ? deletedKeys : null;
  }

  function gedChangedKeys(theNew, theOld) {
    let changedKeys = {};
    for (let key of Object.keys(theNew)) {
      if ((!(key in theOld)) || (theNew[key] !== theOld[key]))
        changedKeys[key] = theNew[key];
      else if ((theOld[key] instanceof Object) && (theNew[key] instanceof Object)) {
        let subChanged = gedChangedKeys(theNew[key], theOld[key]);
        if (subChanged !== null)
          changedKeys[key] = subChanged;
      }
    }
    return Object.keys(changedKeys).length > 0 ? changedKeys : null;
  }
  let returnDict = {};
  let deletedKeys = getDeletedKeys(theNew, theOld);
  let changedKeys = gedChangedKeys(theNew, theOld);
  if (deletedKeys !== null)
    returnDict['-'] = deletedKeys;
  if (changedKeys !== null)
    returnDict['+'] = changedKeys;
  return returnDict;
}
