/**
 * Can open and create files
 */
const FilesManipulator = {
  /**
   * open - open a file. May or may not exist.
   *
   * @param  {string} name                                      name of the opened file
   * @param  {function} onOpen                                    function called after opening a file, with first parameter being opened file
   * @param  {boolean} temporary = false                         if set to true, temporary file is used instead of persistent
   * @param  {number} temporary_size = 5242880                  not super what it does
   * @param  {boolean} append = false                            sets the append mode
   * @param  {function} onErrorLoadFs = FilesManipulator.void     callback function
   * @param  {function} onErrorCreateFile = FilesManipulator.void callback function
   * @return {undefined}
   */
  open: function(name, onOpen, append = false, temporary = false, temporary_size = 5242880, overrideFs = false, onErrorLoadFs = FilesManipulator.void, onErrorCreateFile = FilesManipulator.void) {
    function createFile(dirEntry) {
      dirEntry.getFile(name, {
          create: true,
          exclusive: false
        },
        function(fileEntry) {
          let openedFile = new OpenedFile(fileEntry, append);
          return onOpen(openedFile);
        }, onErrorCreateFile);
    }

    if (overrideFs !== false) { // TODO
      alert('using ' + overrideFs)
      window.resolveLocalFileSystemURL(overrideFs, function(dirEntry) {
        createFile(dirEntry);
      });
    } else {
      window.requestFileSystem(temporary ? window.TEMPORARY : LocalFileSystem.PERSISTENT, temporary ? temporary_size : 0, function(fs) {
        createFile(fs.root);
      });
    }
  },

  /**
   * void - Yeah. Void. Nothingness.
   *
   * @return {undefined}  --- that is nothing. Isn't it?
   */
  void: function() {}
}

/**
 * const OpenedFile - opened file that can be read or written. Should not be called directrly, use FilesManipulator.open()
 *
 * @param  {FileEntry} fileEntry entry obejct
 * @param  {boolean} append    if set to true, writting causes appending isntead of rewriting and trunacting
 * @return {OpenedFile}           opened file that can be read or written
 */
const OpenedFile = function(fileEntry, append) {

  /**
   * OpenedFile.write - writes data to the file
   *
   * @param  {string} data                              text/data to write inside the file
   * @param  {function} onSuccess = FilesManipulator.void callback function on success
   * @param  {function} onError = FilesManipulator.void   callback function on error
   * @return {undefined}
   */
  this.write = function(data, onSuccess = FilesManipulator.void, onError = FilesManipulator.void) {
      fileEntry.createWriter(function(fileWriter) {
        fileWriter.onwriteend = onSuccess;
        fileWriter.onerror = onError;
        if (append)
          fileWriter.seek(fileWriter.length);
        fileWriter.write(data);
      });
      if (!append)
        fileEntry.createWriter(function(fileWriter) {
          fileWriter.truncate(data.length);
        });
    },

    /**
     * this.read - reads the content of the file
     *
     * @param  {function} onSuccess                       function that has result as the first parameter
     * @param  {function} onError = FilesManipulator.void callback function on error
     * @return {undefined}
     */
    this.read = function(onSuccess, onError = FilesManipulator.void) {
      fileEntry.file(function(file) {
        let reader = new FileReader();

        reader.onloadend = function() {
          onSuccess(this.result);
        };
        reader.readAsText(file);
      }, onError);
    }
}
