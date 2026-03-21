export interface RepoItem {
  id?: number
  name: string
  description?: string
}

export interface BankQuestion {
  id?: number
  title: string
  type?: string
}

export async function listRepos(): Promise<RepoItem[]> { return [] }
export async function createRepo(_p: Partial<RepoItem>): Promise<RepoItem> { return { name: '' } }
export async function updateRepo(_id: number, _p: Partial<RepoItem>): Promise<RepoItem> { return { name: '' } }
export async function deleteRepo(_id: number): Promise<void> {}
export async function listBankQuestions(_repoId: number): Promise<BankQuestion[]> { return [] }
export async function addBankQuestion(_repoId: number, _q: Partial<BankQuestion>): Promise<BankQuestion> { return { title: '' } }
export async function removeBankQuestion(_repoId: number, _qId: number): Promise<void> {}
