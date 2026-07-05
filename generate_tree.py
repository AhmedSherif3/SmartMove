import os

EXCLUDE_DIRS = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', '.idea', '.pytest_cache'}

def get_tree(path, prefix=''):
    output = []
    try:
        entries = os.listdir(path)
    except PermissionError:
        return output

    files = []
    dirs = []
    for entry in entries:
        full_path = os.path.join(path, entry)
        if os.path.isdir(full_path):
            if entry not in EXCLUDE_DIRS:
                dirs.append(entry)
        else:
            files.append(entry)
            
    files.sort(key=lambda s: s.lower())
    dirs.sort(key=lambda s: s.lower())
    
    for f in files:
        output.append(f"{prefix}{f}")
        
    for d in dirs:
        output.append(f"{prefix}{d}/")
        output.extend(get_tree(os.path.join(path, d), prefix + '    '))
        
    return output

if __name__ == '__main__':
    os.chdir(r'd:\SmartMove')
    tree = ["./"] + get_tree('.', '    ')
    with open('repo_structure.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(tree) + '\n')
