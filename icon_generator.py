import os.path
from PIL import Image

def list_files(directory, relative=False, files=True, directories=True):
    """Lists all files in directory and subdirectories in absolute path form.
    :param directory directory to be listed
    :param relative if set to true, does return only relative path to the file, based on source folder
    :param files if set to False, only directories are listed
    :param directories if set to False, only files are listed
    :return if :param directory is directory - list of all files and directories in subdirectories
    :return if :param directory is file - list which contains only this file
    :return otherwise None"""
    import os
    if not relative:
        directory = os.path.abspath(directory)
    if not os.path.isdir(directory):
        if os.path.isfile(directory):
            return [directory]
        return None
    listed_files = []
    for file in os.listdir(directory):
        file_path = directory + os.sep + file
        if os.path.isdir(file_path):
            listed_files.extend(list_files(file_path, relative, files, directories))
            if directories:
                listed_files.append(file_path)
        elif files:
            listed_files.append(file_path)
    return listed_files

output_files = {}
for file in list_files('res/icon', directories=False):
    size = os.path.basename(file).split('.')[0].split('-')
    size = int(size[1]) * (2 if len(size) > 2 and size[2] == '2x' else 1)
    output_files[file] = size

print('reading source...')
source = Image.open('icon.png')
for file, size in output_files.items():
    print('saving ', file)
    source.resize((size, size)).save(file, 'PNG')
source.resize((64, 64)).save('www/favicon.png', 'ICO')
print('done')
