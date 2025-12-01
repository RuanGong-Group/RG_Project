import type { Book } from '../../../types/api';

interface BookSelectorProps {
  allBooks: Book[];
  handleSelectBook: (bookId: number) => void;
}

export default function BookSelector({ allBooks, handleSelectBook }: BookSelectorProps) {
  return (
    <div style={{
      minHeight: '100vh',
      padding: '24px',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '16px', fontSize: '20px' }}>
          请选择要学习的词书
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => handleSelectBook(book.id)}
              style={{
                padding: '16px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1890ff';
                e.currentTarget.style.backgroundColor = '#f0f8ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d9d9d9';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                {book.tagName}
              </div>
              <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                共 {book.wordCount} 个单词
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
