import type { StrapiBlock, StrapiInline } from '@/types/strapi';

const renderText = (node: StrapiInline, index: number) => {
  const text = node.text ?? '';
  let className = '';
  if (node.bold) className += ' font-semibold';
  if (node.italic) className += ' italic';
  if (node.underline) className += ' underline';
  if (node.strikethrough) className += ' line-through';
  if (node.code) className += ' font-mono bg-neutral-100 px-1 py-0.5 rounded';

  if (node.type === 'link' && node.url) {
    return (
      <a
        key={index}
        href={node.url}
        className={`text-red-700 underline underline-offset-4${className}`}
        target={node.url.startsWith('http') ? '_blank' : undefined}
        rel={node.url.startsWith('http') ? 'noreferrer' : undefined}
      >
        {node.children?.map(renderText) ?? text}
      </a>
    );
  }

  return (
    <span key={index} className={className.trim() || undefined}>
      {text}
    </span>
  );
};

const renderChildren = (children?: StrapiInline[]) => {
  if (!children || children.length === 0) return null;
  return children.map((child, index) => {
    if (child.type === 'link' && child.url) {
      return renderText(child, index);
    }
    return renderText(child, index);
  });
};

const renderBlock = (block: StrapiBlock, index: number) => {
  switch (block.type) {
    case 'heading': {
      const level = block.level ?? 2;
      const Tag = `h${Math.min(Math.max(level, 2), 4)}` as 'h2' | 'h3' | 'h4';
      return (
        <Tag key={index} className="mt-5 text-lg font-semibold text-neutral-900">
          {renderChildren(block.children)}
        </Tag>
      );
    }
    case 'list': {
      const isOrdered = block.format === 'ordered';
      const ListTag = isOrdered ? 'ol' : 'ul';
      return (
        <ListTag key={index} className="mt-3 space-y-1 pl-5 text-neutral-700">
          {block.children?.map((child, childIndex) => (
            <li key={childIndex}>{renderChildren(child.children)}</li>
          ))}
        </ListTag>
      );
    }
    case 'quote':
      return (
        <blockquote
          key={index}
          className="mt-4 border-l-4 border-red-200 bg-red-50/60 px-4 py-3 text-neutral-700"
        >
          {renderChildren(block.children)}
        </blockquote>
      );
    case 'paragraph':
    default:
      return (
        <p key={index} className="mt-3 text-neutral-700">
          {renderChildren(block.children)}
        </p>
      );
  }
};

export const RichTextRenderer = ({ content }: { content?: StrapiBlock[] | string | null }) => {
  if (!content) return null;
  if (typeof content === 'string') {
    return <div className="prose prose-neutral max-w-none" dangerouslySetInnerHTML={{ __html: content }} />;
  }
  return <div>{content.map(renderBlock)}</div>;
};
